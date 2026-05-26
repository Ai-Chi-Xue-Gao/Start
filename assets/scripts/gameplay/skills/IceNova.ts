// assets/scripts/gameplay/skills/IceNova.ts

import { _decorator, Node, Vec3, instantiate, Prefab, tween, UIOpacity } from 'cc';
import { BaseComponent } from '../../core/BaseComponent';
import { Enemy } from '../enemy/Enemy';
import { SkillManager } from '../../Managers/SkillManager';
import { EventBus } from '../../core/EventBus';
import { EventNames } from '../../utils/EventNames';
import { GameStateMachine } from '../../core/GameStateMachine';

const { ccclass, property } = _decorator;

/**
 * 冰霜新星技能组件
 * 周期性释放范围减速效果
 */
@ccclass('IceNova')
export class IceNova extends BaseComponent {
    @property(Prefab)
    novaEffectPrefab: Prefab = null;    // 冰霜新星特效预制体

    private hasSkill: boolean = false;
    private currentLevel: number = 0;
    private cooldown: number = 5;        // 当前冷却时间（秒）
    private slowPercent: number = 0.4;    // 减速百分比
    private slowDuration: number = 2;     // 减速持续时间
    private timer: number = 0;            // 当前计时器

    start() {
        this.initSkillStatus();
    }

    /**
     * 初始化技能状态
     */
    private initSkillStatus() {
        const skillManager = SkillManager.getInstance();
        if (skillManager && skillManager.hasSkill('ice_nova')) {
            this.updateSkillStatus();
        }
    }

    /**
     * 更新技能状态（技能学习/升级时调用）
     */
    public updateSkillStatus() {
        const skillManager = SkillManager.getInstance();

        if (skillManager && skillManager.hasSkill('ice_nova')) {
            const level = skillManager.getSkillLevel('ice_nova');
            this.currentLevel = level;
            this.hasSkill = true;

            // 获取技能数值
            const stats = skillManager.getSkillStat('ice_nova', level);
            if (stats) {
                this.cooldown = stats.cooldown || 5;
                this.slowPercent = stats.slowPercent || 0.4;
                this.slowDuration = stats.slowDuration || 2;
            }

            // 重置计时器，立即释放第一次
            this.timer = 0;

            console.log(`[冰霜新星] 技能等级 ${level}，冷却 ${this.cooldown}秒，减速 ${this.slowPercent * 100}%，持续 ${this.slowDuration}秒`);
        } else {
            this.hasSkill = false;
            this.currentLevel = 0;
        }
    }

    /**
     * 释放冰霜新星
     */
    private castNova() {
        if (!this.hasSkill) return;

        // 获取玩家位置
        const playerPos = this.node.worldPosition;

        // 播放特效
        this.playEffect(playerPos);

        // 查找周围敌人并施加减速
        this.slowNearbyEnemies(playerPos);

        console.log(`[冰霜新星] 释放！冷却 ${this.cooldown}秒`);
    }

    /**
     * 播放冰霜新星特效
     */
    private playEffect(position: Vec3) {
    if (this.novaEffectPrefab) {
        const effect = instantiate(this.novaEffectPrefab);
        
        // 挂载到 Background 节点
        const canvas = this.node.scene?.getChildByName('Canvas');
        const backgroundNode = canvas?.getChildByName('Background');
        
        if (backgroundNode) {
            effect.setParent(backgroundNode);
            // 设置相对位置为 (0,0,0)，这样特效就在 Background 的原点
            effect.setPosition(0, 0, 0);
            
            // 使用世界坐标设置位置
            effect.setWorldPosition(position.x, position.y, 0);
        } else {
            effect.setParent(canvas);
            effect.setWorldPosition(position.x, position.y, 0);
        }
        
    }
}

    /**
     * 减速周围敌人
     */
    private slowNearbyEnemies(centerPos: Vec3) {
        // 查找 Canvas 下的所有敌人
        const canvas = this.node.scene?.getChildByName('Canvas');
        if (!canvas) return;

        // 查找 WaveManager 下的敌人
        const waveManager = canvas.getChildByName('WaveManager');
        let slowedCount = 0;

        if (waveManager) {
            for (const child of waveManager.children) {
                const enemy = child.getComponent(Enemy);
                if (enemy && !enemy.isDead) {
                    const enemyPos = child.worldPosition;
                    const distance = Vec3.distance(centerPos, enemyPos);

                    // 范围 200 像素内
                    if (distance < 200) {
                        this.applySlowToEnemy(enemy);
                        slowedCount++;
                    }
                }
            }
        }

        // 也查找网络敌人（联机模式）
        for (const child of canvas.children) {
            if (child.name.startsWith('NetworkEnemy_') && child.isValid) {
                const networkEnemy = child.getComponent('NetworkEnemy') as any;
                if (networkEnemy && !networkEnemy.isDead) {
                    const enemyPos = child.worldPosition;
                    const distance = Vec3.distance(centerPos, enemyPos);

                    if (distance < 200) {
                        // 网络敌人减速（通过事件）
                        EventBus.emit('network_enemy_slow', { enemy: child, slowPercent: this.slowPercent, duration: this.slowDuration });
                        slowedCount++;
                    }
                }
            }
        }

        console.log(`[冰霜新星] 减速了 ${slowedCount} 个敌人`);
    }

    /**
     * 对单个敌人施加减速
     */
    private applySlowToEnemy(enemy: Enemy) {
        // 保存原始速度
        const originalSpeed = (enemy as any).__originalSpeed;
        if (originalSpeed === undefined) {
            (enemy as any).__originalSpeed = enemy.speed;
        }

        const oldSpeed = enemy.speed;
        const newSpeed = (enemy as any).__originalSpeed * (1 - this.slowPercent);
        enemy.speed = Math.max(20, newSpeed);

        // 延迟恢复
        this.scheduleOnce(() => {
            if (enemy && enemy.isValid && !enemy.isDead) {
                const origSpeed = (enemy as any).__originalSpeed;
                if (origSpeed !== undefined) {
                    enemy.speed = origSpeed;
                }
            }
        }, this.slowDuration);
    }



    update(deltaTime: number) {
        if (!this.hasSkill) return;

        const stateMachine = this.getService<GameStateMachine>('stateMachine');
        if (stateMachine && stateMachine.isPaused()) {
            return;
        }

        // 计时器更新
        this.timer += deltaTime;
        if (this.timer >= this.cooldown) {
            this.timer = 0;
            this.castNova();
        }
    }
}