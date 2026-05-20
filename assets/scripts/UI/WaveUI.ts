import { _decorator, Component, Label, Node, tween, UIOpacity } from 'cc';
import { EventBus } from '../core/EventBus';
import { WaveConfig } from '../configs/GameConfig';
import { ServiceLocator } from '../core/ServiceLocator';
import { GameStateMachine } from '../core/GameStateMachine';

const { ccclass, property } = _decorator;

/**
 * 波次类型
 */
type WaveType = 'grind' | 'threat' | 'breather'

/**
 * 波次信息显示组件
 */
@ccclass('WaveUI')
export class WaveUI extends Component {
    @property(Label)
    waveLabel: Label = null           // 波次文本 "第 10 波"

    @property(Label)
    waveStatusLabel: Label = null     // 状态文本 "战斗中" / "喘息波"

    @property(Node)
    breakPanel: Node = null           // 波次间隔面板

    @property(Label)
    breakTimerLabel: Label = null     // 休息倒计时文本

    @property(Node)
    waveStartEffect: Node = null      // 波次开始特效（可选）

    private currentWave: number = 1
    private breakTimer: number = 0
    private isBreak: boolean = false

    // 波次类型配置
    private readonly waveTypeConfig: Record<WaveType, { name: string; color: string }> = {
        'grind': { name: '⚔️ 战斗', color: '#FFFFFF' },
        'threat': { name: '🔥 威胁波', color: '#FF6666' },
        'breather': { name: '💚 喘息波', color: '#66FF66' }
    }

    start() {
        // 初始隐藏休息面板
        if (this.breakPanel) {
            this.breakPanel.active = false
        }

        // 监听波次事件
        EventBus.on('wave_start', this.onWaveStart, this)
        EventBus.on('wave_complete', this.onWaveComplete, this)

        // 初始显示
        this.updateWaveDisplay()
    }

    protected onDestroy() {
        EventBus.off('wave_start', this.onWaveStart, this)
        EventBus.off('wave_complete', this.onWaveComplete, this)
    }

    /**
     * 波次开始回调
     */
    private onWaveStart(data: { wave: number; type: string }) {
        this.currentWave = data.wave
        this.isBreak = false

        // 隐藏休息面板
        if (this.breakPanel) {
            this.breakPanel.active = false
        }

        // 更新显示
        this.updateWaveDisplay()

        // 播放波次开始特效
        this.playWaveStartEffect()
    }

    /**
     * 波次完成回调（进入休息）
     */
    private onWaveComplete(data: { wave: number }) {
        this.isBreak = true
        this.breakTimer = WaveConfig.WAVE_BREAK_TIME

        // 显示休息面板
        if (this.breakPanel) {
            this.breakPanel.active = true
        }

        // 更新状态文本
        if (this.waveStatusLabel) {
            this.waveStatusLabel.string = '⏸️ 准备中'
        }
    }

    /**
     * 更新波次显示
     */
    private updateWaveDisplay() {
        // 更新波次文本
        if (this.waveLabel) {
            this.waveLabel.string = `第 ${this.currentWave} 波`
        }

        // 更新状态文本（如果不是休息状态）
        if (this.waveStatusLabel && !this.isBreak) {
            this.waveStatusLabel.string = '⚔️ 战斗中'
        }
    }

    /**
     * 播放波次开始特效
     */
    private playWaveStartEffect() {
        if (!this.waveStartEffect) return

        this.waveStartEffect.active = true

        // 淡出特效
        const uiOpacity = this.waveStartEffect.getComponent(UIOpacity)
        if (uiOpacity) {
            uiOpacity.opacity = 255
            tween(uiOpacity)
                .delay(0.5)
                .to(0.5, { opacity: 0 })
                .call(() => {
                    this.waveStartEffect.active = false
                    uiOpacity.opacity = 255
                })
                .start()
        } else {
            this.scheduleOnce(() => {
                this.waveStartEffect.active = false
            }, 1)
        }
    }

    /**
     * 设置当前波次（外部调用）
     */
    public setWave(wave: number, waveType: WaveType = 'grind') {
        this.currentWave = wave
        this.isBreak = false

        if (this.waveLabel) {
            this.waveLabel.string = `第 ${wave} 波`
        }

        if (this.waveStatusLabel) {
            const config = this.waveTypeConfig[waveType] || this.waveTypeConfig.grind
            this.waveStatusLabel.string = config.name
        }

        // 隐藏休息面板
        if (this.breakPanel) {
            this.breakPanel.active = false
        }
    }

    /**
     * 设置休息倒计时
     */
    public setBreakTimer(seconds: number) {
        this.isBreak = true
        this.breakTimer = seconds

        if (this.breakPanel) {
            this.breakPanel.active = true
        }

        if (this.waveStatusLabel) {
            this.waveStatusLabel.string = '⏸️ 准备中'
        }
    }

    /**
     * 手动刷新
     */
    public refresh() {
        this.updateWaveDisplay()
    }

    update(deltaTime: number) {
        // 检查游戏是否暂停（技能选择面板或手动暂停时）
        const stateMachine = ServiceLocator.getInstance().get<GameStateMachine>('stateMachine')
        if (stateMachine && stateMachine.isPaused()) {
            return
        }

        // 更新休息倒计时
        if (this.isBreak && this.breakTimer > 0) {
            this.breakTimer -= deltaTime

            if (this.breakTimerLabel) {
                const seconds = Math.ceil(this.breakTimer)
                this.breakTimerLabel.string = `${seconds}`
            }

            // 倒计时结束，休息面板自动隐藏（等待下一波开始）
            if (this.breakTimer <= 0) {
                this.isBreak = false
                if (this.breakPanel) {
                    this.breakPanel.active = false
                }
            }
        }
    }
}