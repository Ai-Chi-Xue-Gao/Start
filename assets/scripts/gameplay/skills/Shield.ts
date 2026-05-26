// assets/scripts/gameplay/skills/Shield.ts

import { _decorator } from 'cc';
import { BaseComponent } from '../../core/BaseComponent';
import { SkillManager } from '../../Managers/SkillManager';
import { GameStateMachine } from '../../core/GameStateMachine';

const { ccclass, property } = _decorator;

@ccclass('Shield')
export class Shield extends BaseComponent {
    private hasSkill: boolean = false;
    private currentLevel: number = 0;
    private cooldown: number = 30;
    private shieldAmount: number = 50;
    private timer: number = 0;
    private isReady: boolean = true;

    start() {
        this.initSkillStatus();
    }

    private initSkillStatus() {
        const skillManager = SkillManager.getInstance();
        if (skillManager && skillManager.hasSkill('shield')) {
            this.updateSkillStatus();
        }
    }

    public updateSkillStatus() {
        const skillManager = SkillManager.getInstance();

        if (skillManager && skillManager.hasSkill('shield')) {
            const level = skillManager.getSkillLevel('shield');
            this.currentLevel = level;
            this.hasSkill = true;

            const stats = skillManager.getSkillStat('shield', level);
            if (stats) {
                this.cooldown = stats.cooldown || 30;
                this.shieldAmount = stats.shieldAmount || 50;
            }

            this.timer = 0;
            this.isReady = true;

            // 直接调用，不延迟
            this.applyShield();

            console.log(`[护盾] 技能等级 ${level}，冷却 ${this.cooldown}秒，护盾值 ${this.shieldAmount}`);
        } else {
            this.hasSkill = false;
            this.currentLevel = 0;
        }
    }

    private applyShield() {
        console.log(`[护盾] applyShield 被调用, hasSkill=${this.hasSkill}, isReady=${this.isReady}`);
        
        if (!this.hasSkill) return;
        if (!this.isReady) return;

        const player = this.node.getComponent('PlayerController') as any;
        if (!player) {
            console.log(`[护盾] 获取 PlayerController 失败`);
            return;
        }

        const health = player.getHealth?.();
        if (!health) {
            console.log(`[护盾] 获取 PlayerHealth 失败`);
            return;
        }

        health.addShield(this.shieldAmount);
        this.isReady = false;
        this.timer = 0;

        console.log(`[护盾] 获得 ${this.shieldAmount} 点护盾`);
    }

    update(deltaTime: number) {
        if (!this.hasSkill) return;

        const stateMachine = this.getService<GameStateMachine>('stateMachine');
        if (stateMachine && stateMachine.isPaused()) {
            return;
        }

        if (!this.isReady) {
            this.timer += deltaTime;
            if (this.timer >= this.cooldown) {
                this.isReady = true;
                this.timer = 0;
                this.applyShield();
            }
        }
    }
}