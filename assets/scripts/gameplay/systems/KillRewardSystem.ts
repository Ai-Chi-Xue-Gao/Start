// assets/scripts/gameplay/systems/KillRewardSystem.ts

import { _decorator, Node } from 'cc';
import { BaseComponent } from '../../core/BaseComponent';
import { EventBus } from '../../core/EventBus';
import { EventNames } from '../../utils/EventNames';
import { SkillManager } from '../../Managers/SkillManager';

const { ccclass, property } = _decorator;

/**
 * 杀怪奖励系统
 * 管理所有杀怪奖励技能
 */
@ccclass('KillRewardSystem')
export class KillRewardSystem extends BaseComponent {
    private skillManager: SkillManager = null;
    private player: any = null;

    // 杀怪计数（用于重生技能）
    private killCount: number = 0;

    // 技能等级缓存
    private killAttackLevel: number = 0;
    private killHealthLevel: number = 0;
    private killSpeedLevel: number = 0;
    private killCooldownLevel: number = 0;
    private killExpLevel: number = 0;
    private killVampireLevel: number = 0;
    private killShieldLevel: number = 0;
    private killRageLevel: number = 0;
    private killLuckyLevel: number = 0;
    private killRebirthLevel: number = 0;

    // 暴怒效果计时
    private rageTimer: number = 0;
    private rageDuration: number = 0;
    private rageDamageBonus: number = 0;
    private isRageActive: boolean = false;

    // 重生计数
    private rebirthKillRequired: number = 50;
    private rebirthAvailable: boolean = true;

    start() {
        console.log('[KillRewardSystem] start() 被调用');
        this.skillManager = SkillManager.getInstance();
        this.player = this.node.getComponent('PlayerController') as any;

        // 监听击杀事件
        EventBus.on(EventNames.ENEMY_DIED, this.onEnemyKilled, this);

        // 初始化技能状态
        this.updateAllSkillStatus();
    }

    protected onDestroy() {
        EventBus.off(EventNames.ENEMY_DIED, this.onEnemyKilled, this);
    }

    /**
     * 更新所有技能状态（技能学习/升级时调用）
     */
    public updateAllSkillStatus() {
        this.updateKillAttack();
        this.updateKillHealth();
        this.updateKillSpeed();
        this.updateKillCooldown();
        this.updateKillExp();
        this.updateKillVampire();
        this.updateKillShield();
        this.updateKillRage();
        this.updateKillLucky();
        this.updateKillRebirth();
    }

    /**
     * 杀戮欲望：永久增加攻击力
     */
    private updateKillAttack() {
        const skillId = 'kill_attack';
        if (this.skillManager && this.skillManager.hasSkill(skillId)) {
            const level = this.skillManager.getSkillLevel(skillId);
            if (level > this.killAttackLevel) {
                const added = level - this.killAttackLevel;
                const stats = this.skillManager.getSkillStat(skillId, level);
                if (stats && stats.attackBonus) {
                    this.player.addPermanentAttack(stats.attackBonus * added);
                    console.log(`[杀戮欲望] 永久攻击力 +${stats.attackBonus * added}`);
                }
                this.killAttackLevel = level;
            }
        }
    }

    /**
     * 生命汲取：永久增加生命值
     */
    private updateKillHealth() {
        const skillId = 'kill_health';
        if (this.skillManager && this.skillManager.hasSkill(skillId)) {
            const level = this.skillManager.getSkillLevel(skillId);
            if (level > this.killHealthLevel) {
                const added = level - this.killHealthLevel;
                const stats = this.skillManager.getSkillStat(skillId, level);
                if (stats && stats.healthBonus) {
                    this.player.addPermanentHealth(stats.healthBonus * added);
                    console.log(`[生命汲取] 永久生命值 +${stats.healthBonus * added}`);
                }
                this.killHealthLevel = level;
            }
        }
    }

    /**
     * 疾风步伐：永久增加移动速度
     */
    private updateKillSpeed() {
        const skillId = 'kill_speed';
        if (this.skillManager && this.skillManager.hasSkill(skillId)) {
            const level = this.skillManager.getSkillLevel(skillId);
            if (level > this.killSpeedLevel) {
                const added = level - this.killSpeedLevel;
                const stats = this.skillManager.getSkillStat(skillId, level);
                if (stats && stats.speedBonusPercent) {
                    this.player.addPermanentSpeed(stats.speedBonusPercent * added);
                    console.log(`[疾风步伐] 永久移速 +${(stats.speedBonusPercent * added * 100).toFixed(1)}%`);
                }
                this.killSpeedLevel = level;
            }
        }
    }

    /**
     * 专注：永久减少攻击冷却
     */
    private updateKillCooldown() {
        const skillId = 'kill_cooldown';
        if (this.skillManager && this.skillManager.hasSkill(skillId)) {
            const level = this.skillManager.getSkillLevel(skillId);
            if (level > this.killCooldownLevel) {
                const added = level - this.killCooldownLevel;
                const stats = this.skillManager.getSkillStat(skillId, level);
                if (stats && stats.cooldownBonus) {
                    this.player.addPermanentCooldown(stats.cooldownBonus * added);
                    console.log(`[专注] 永久冷却 -${stats.cooldownBonus * added}秒`);
                }
                this.killCooldownLevel = level;
            }
        }
    }

    /**
     * 经验狂魔：永久增加经验获取
     */
    private updateKillExp() {
        const skillId = 'kill_exp';
        if (this.skillManager && this.skillManager.hasSkill(skillId)) {
            const level = this.skillManager.getSkillLevel(skillId);
            if (level > this.killExpLevel) {
                const added = level - this.killExpLevel;
                const stats = this.skillManager.getSkillStat(skillId, level);
                if (stats && stats.expBonusPercent) {
                    this.player.addPermanentExp(stats.expBonusPercent * added);
                    console.log(`[经验狂魔] 永久经验获取 +${(stats.expBonusPercent * added * 100).toFixed(1)}%`);
                }
                this.killExpLevel = level;
            }
        }
    }

    /**
     * 嗜血：击杀回复生命值
     */
    private updateKillVampire() {
        const skillId = 'kill_vampire';
        if (this.skillManager && this.skillManager.hasSkill(skillId)) {
            const level = this.skillManager.getSkillLevel(skillId);
            if (level > this.killVampireLevel) {
                this.killVampireLevel = level;
                console.log(`[嗜血] 技能等级 ${level}`);
            }
        }
    }

    /**
     * 护盾掌握：击杀获得临时护盾
     */
    private updateKillShield() {
        const skillId = 'kill_shield';
        if (this.skillManager && this.skillManager.hasSkill(skillId)) {
            const level = this.skillManager.getSkillLevel(skillId);
            if (level > this.killShieldLevel) {
                this.killShieldLevel = level;
                console.log(`[护盾掌握] 技能等级 ${level}`);
            }
        }
    }

    /**
     * 暴怒：击杀后临时增加攻击力
     */
    private updateKillRage() {
        const skillId = 'kill_rage';
        if (this.skillManager && this.skillManager.hasSkill(skillId)) {
            const level = this.skillManager.getSkillLevel(skillId);
            if (level > this.killRageLevel) {
                const stats = this.skillManager.getSkillStat(skillId, level);
                if (stats) {
                    this.rageDuration = stats.rageDuration || 3;
                    this.rageDamageBonus = stats.rageDamageBonus || 0.3;
                }
                this.killRageLevel = level;
                console.log(`[暴怒] 技能等级 ${level}，持续 ${this.rageDuration}秒，伤害+${this.rageDamageBonus * 100}%`);
            }
        }
    }

    /**
     * 幸运：增加额外经验球掉落
     */
    private updateKillLucky() {
        const skillId = 'kill_lucky';
        if (this.skillManager && this.skillManager.hasSkill(skillId)) {
            const level = this.skillManager.getSkillLevel(skillId);
            if (level > this.killLuckyLevel) {
                this.killLuckyLevel = level;
                console.log(`[幸运] 技能等级 ${level}`);
            }
        }
    }

    /**
     * 重生：每击杀指定数量敌人获得复活
     */
    private updateKillRebirth() {
        const skillId = 'kill_rebirth';
        if (this.skillManager && this.skillManager.hasSkill(skillId)) {
            const level = this.skillManager.getSkillLevel(skillId);
            if (level > this.killRebirthLevel) {
                const stats = this.skillManager.getSkillStat(skillId, level);
                if (stats && stats.killRequired) {
                    this.rebirthKillRequired = stats.killRequired;
                }
                this.killRebirthLevel = level;
                //  学习/升级时重置击杀计数
                this.killCount = 0;
                console.log(`[重生] 技能等级 ${level}，每击杀 ${this.rebirthKillRequired} 敌人获得复活`);
            }
        }
    }

    /**
     * 击杀敌人时调用
     */
    private onEnemyKilled(pos: any, enemy: any) {
        console.log('[KillRewardSystem] onEnemyKilled 被调用');  //  添加
        console.log('[KillRewardSystem] killAttackLevel =', this.killAttackLevel);  //  添加
        this.killCount++;

        // ========== 永久属性增加（每次击杀触发）==========

        // 杀戮欲望：永久增加攻击力
        if (this.killAttackLevel > 0) {
            const stats = this.skillManager.getSkillStat('kill_attack', this.killAttackLevel);
            if (stats && stats.attackBonus) {
                this.player.addPermanentAttack(stats.attackBonus);
                console.log(`[杀戮欲望] 永久攻击力 +${stats.attackBonus}`);
            }
        }

        // 生命汲取：永久增加生命值
        if (this.killHealthLevel > 0) {
            const stats = this.skillManager.getSkillStat('kill_health', this.killHealthLevel);
            if (stats && stats.healthBonus) {
                this.player.addPermanentHealth(stats.healthBonus);
                console.log(`[生命汲取] 永久生命值 +${stats.healthBonus}`);
            }
        }

        // 疾风步伐：永久增加移动速度
        if (this.killSpeedLevel > 0) {
            const stats = this.skillManager.getSkillStat('kill_speed', this.killSpeedLevel);
            if (stats && stats.speedBonusPercent) {
                this.player.addPermanentSpeed(stats.speedBonusPercent);
                console.log(`[疾风步伐] 永久移速 +${(stats.speedBonusPercent * 100).toFixed(1)}%`);
            }
        }

        // 专注：永久减少攻击冷却
        if (this.killCooldownLevel > 0) {
            const stats = this.skillManager.getSkillStat('kill_cooldown', this.killCooldownLevel);
            if (stats && stats.cooldownBonus) {
                this.player.addPermanentCooldown(stats.cooldownBonus);
                console.log(`[专注] 永久冷却 -${stats.cooldownBonus}秒`);
            }
        }

        // 经验狂魔：永久增加经验获取
        if (this.killExpLevel > 0) {
            const stats = this.skillManager.getSkillStat('kill_exp', this.killExpLevel);
            if (stats && stats.expBonusPercent) {
                this.player.addPermanentExp(stats.expBonusPercent);
                console.log(`[经验狂魔] 永久经验获取 +${(stats.expBonusPercent * 100).toFixed(1)}%`);
            }
        }

        // ========== 即时效果（每次击杀触发）==========

        // 嗜血：击杀回复生命值
        if (this.killVampireLevel > 0) {
            const stats = this.skillManager.getSkillStat('kill_vampire', this.killVampireLevel);
            if (stats && stats.healAmount) {
                this.player.heal(stats.healAmount);
                console.log(`[嗜血] 回复 ${stats.healAmount} 生命值`);
            }
        }

        // 护盾掌握：击杀获得临时护盾
        if (this.killShieldLevel > 0) {
            const stats = this.skillManager.getSkillStat('kill_shield', this.killShieldLevel);
            if (stats && stats.shieldAmount) {
                this.player.addKillShield(stats.shieldAmount);
                console.log(`[护盾掌握] 获得 ${stats.shieldAmount} 点临时护盾`);
            }
        }

        // 暴怒：击杀后临时增加攻击力
        if (this.killRageLevel > 0 && !this.isRageActive) {
            this.activateRage();
        }

        // 幸运：额外经验球掉落
        if (this.killLuckyLevel > 0) {
            const stats = this.skillManager.getSkillStat('kill_lucky', this.killLuckyLevel);
            if (stats && stats.dropBonusPercent) {
                // 根据几率掉落额外经验球
                if (Math.random() < stats.dropBonusPercent) {
                    this.spawnBonusExpBall(pos);
                    console.log(`[幸运] 触发额外经验球掉落`);
                }
            }
        }

        // 重生：计数
        if (this.killRebirthLevel > 0 && this.rebirthAvailable) {
            if (this.killCount >= this.rebirthKillRequired) {
                this.killCount = 0;
                this.grantRebirth();
            }
        }
    }

    /**
     * 激活暴怒效果
     */
    private activateRage() {
        this.isRageActive = true;
        this.player.addTemporaryAttackBonus(this.rageDamageBonus, this.rageDuration);
        console.log(`[暴怒] 激活！攻击力 +${this.rageDamageBonus * 100}%，持续 ${this.rageDuration}秒`);

        this.scheduleOnce(() => {
            this.isRageActive = false;
            console.log(`[暴怒] 效果结束`);
        }, this.rageDuration);
    }

    /**
     * 生成额外经验球
     */
    private spawnBonusExpBall(position: any) {
        // 触发额外经验球掉落事件
        EventBus.emit('spawn_bonus_exp', position);
    }

    /**
     * 获得复活机会
     */
    private grantRebirth() {
        this.rebirthAvailable = false;  // 重置计数状态
        this.player.setRebirthAvailable(true);
        console.log(`[重生] 击杀 ${this.rebirthKillRequired} 敌人，获得一次复活机会！`);
    }

    update(deltaTime: number) {
        // 暴怒计时由 PlayerController 的 updateTemporaryBonus 处理
    }
}