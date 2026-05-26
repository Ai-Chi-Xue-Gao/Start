// assets/scripts/gameplay/skills/WoodRegen.ts

import { _decorator } from 'cc';
import { BaseComponent } from '../../core/BaseComponent';
import { SkillManager } from '../../Managers/SkillManager';
import { GameStateMachine } from '../../core/GameStateMachine';

const { ccclass, property } = _decorator;

/**
 * 青木生机技能组件
 * 每秒回复最大生命值百分比
 */
@ccclass('WoodRegen')
export class WoodRegen extends BaseComponent {
    private hasSkill: boolean = false;
    private currentLevel: number = 0;
    private regenPercent: number = 0.01;
    private regenTimer: number = 0;
    private regenInterval: number = 1.0;

    start() {
        this.initSkillStatus();
    }

    /**
     * 初始化技能状态
     */
    private initSkillStatus() {
        const skillManager = SkillManager.getInstance();
        if (skillManager && skillManager.hasSkill('wood_regen')) {
            this.updateSkillStatus();
        }
    }

    /**
     * 更新技能状态（技能学习/升级时调用）
     */
    public updateSkillStatus() {
        const skillManager = SkillManager.getInstance();

        if (skillManager && skillManager.hasSkill('wood_regen')) {
            const level = skillManager.getSkillLevel('wood_regen');
            this.currentLevel = level;
            this.hasSkill = true;

            const stats = skillManager.getSkillStat('wood_regen', level);
            if (stats && stats.hpRegenPercent) {
                this.regenPercent = stats.hpRegenPercent;
            }

            console.log(`[青木生机] 技能等级 ${level}，每秒回血 ${(this.regenPercent * 100).toFixed(1)}%`);
        } else {
            this.hasSkill = false;
            this.currentLevel = 0;
            this.regenPercent = 0.005;
        }
    }

    /**
     * 执行回血
     */
    private applyRegen() {
        if (!this.hasSkill) return;

        const player = this.node.getComponent('PlayerController') as any;
        if (!player) return;

        const maxHp = player.getMaxHealth();
        const currentHp = player.getCurrentHealth();

        if (currentHp <= 0 || currentHp >= maxHp) return;

        const healAmount = Math.max(1, Math.floor(maxHp * this.regenPercent));
        player.heal?.(healAmount);
    }

    update(deltaTime: number) {
        if (!this.hasSkill) return;

        const stateMachine = this.getService<GameStateMachine>('stateMachine');
        if (stateMachine && stateMachine.isPaused()) {
            return;
        }

        this.regenTimer += deltaTime;
        if (this.regenTimer >= this.regenInterval) {
            this.regenTimer = 0;
            this.applyRegen();
        }
    }
}