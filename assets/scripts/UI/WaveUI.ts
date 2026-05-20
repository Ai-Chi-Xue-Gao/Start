// assets/scripts/ui/WaveUI.ts

import { _decorator, Label, Node, tween, UIOpacity } from 'cc';
import { BaseComponent } from '../core/BaseComponent';
import { EventBus } from '../core/EventBus';
import { EventNames } from '../utils/EventNames';
import { WaveConfig } from '../configs/GameConfig';
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
export class WaveUI extends BaseComponent {
    @property(Label)
    waveLabel: Label = null

    @property(Label)
    waveStatusLabel: Label = null

    @property(Node)
    breakPanel: Node = null

    @property(Label)
    breakTimerLabel: Label = null

    @property(Node)
    waveStartEffect: Node = null

    private currentWave: number = 1
    private breakTimer: number = 0
    private isBreak: boolean = false

    private readonly waveTypeConfig: Record<WaveType, { name: string; color: string }> = {
        'grind': { name: '⚔️ 战斗', color: '#FFFFFF' },
        'threat': { name: '🔥 威胁波', color: '#FF6666' },
        'breather': { name: '💚 喘息波', color: '#66FF66' }
    }

    start() {
        if (this.breakPanel) {
            this.breakPanel.active = false
        }

        EventBus.on(EventNames.WAVE_START, this.onWaveStart, this)
        EventBus.on(EventNames.WAVE_COMPLETE, this.onWaveComplete, this)

        this.updateWaveDisplay()
    }

    protected onDestroy() {
        EventBus.off(EventNames.WAVE_START, this.onWaveStart, this)
        EventBus.off(EventNames.WAVE_COMPLETE, this.onWaveComplete, this)
    }

    private onWaveStart(data: { wave: number; type: string }) {
        this.currentWave = data.wave
        this.isBreak = false

        if (this.breakPanel) {
            this.breakPanel.active = false
        }

        this.updateWaveDisplay()
        this.playWaveStartEffect()
    }

    private onWaveComplete(data: { wave: number }) {
        this.isBreak = true
        this.breakTimer = WaveConfig.WAVE_BREAK_TIME

        if (this.breakPanel) {
            this.breakPanel.active = true
        }

        if (this.waveStatusLabel) {
            this.waveStatusLabel.string = '⏸️ 准备中'
        }
    }

    private updateWaveDisplay() {
        if (this.waveLabel) {
            this.waveLabel.string = `第 ${this.currentWave} 波`
        }

        if (this.waveStatusLabel && !this.isBreak) {
            this.waveStatusLabel.string = '⚔️ 战斗中'
        }
    }

    private playWaveStartEffect() {
        if (!this.waveStartEffect) return

        this.waveStartEffect.active = true

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

        if (this.breakPanel) {
            this.breakPanel.active = false
        }
    }

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

    public refresh() {
        this.updateWaveDisplay()
    }

    update(deltaTime: number) {
        const stateMachine = this.getService<GameStateMachine>('stateMachine')
        if (stateMachine && stateMachine.isPaused()) {
            return
        }

        if (this.isBreak && this.breakTimer > 0) {
            this.breakTimer -= deltaTime

            if (this.breakTimerLabel) {
                const seconds = Math.ceil(this.breakTimer)
                this.breakTimerLabel.string = `${seconds}`
            }

            if (this.breakTimer <= 0) {
                this.isBreak = false
                if (this.breakPanel) {
                    this.breakPanel.active = false
                }
            }
        }
    }
}