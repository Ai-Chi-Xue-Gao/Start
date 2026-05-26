// assets/scripts/gameplay/skills/SummonRoot.ts

import { _decorator, Node, Vec3, instantiate, Prefab } from 'cc';
import { BaseComponent } from '../../core/BaseComponent';
import { SkillManager } from '../../Managers/SkillManager';
import { RootMinion } from '../summon/RootMinion';
import { GameStateMachine } from '../../core/GameStateMachine';

const { ccclass, property } = _decorator;

/**
 * 灵木之仆技能组件
 * 召唤藤蔓仆从
 */
@ccclass('SummonRoot')
export class SummonRoot extends BaseComponent {
    @property(Prefab)
    minionPrefab: Prefab = null;        // 藤蔓仆从预制体

    private hasSkill: boolean = false;
    private currentLevel: number = 0;
    private summonCount: number = 1;     // 召唤数量
    private summonDamage: number = 30;   // 仆从伤害
    private playerSpeed: number = 300;   // 玩家移动速度
    private minions: Node[] = [];         // 当前存在的仆从
    private spawnTimer: number = 0;
    private spawnInterval: number = 10;   // 重新召唤间隔（秒）

    start() {
        this.initSkillStatus();
    }

    /**
     * 初始化技能状态
     */
    private initSkillStatus() {
        const skillManager = SkillManager.getInstance();
        if (skillManager && skillManager.hasSkill('summon_root')) {
            this.updateSkillStatus();
        }
    }

    /**
     * 更新技能状态
     */
    public updateSkillStatus() {
        const skillManager = SkillManager.getInstance();

        if (skillManager && skillManager.hasSkill('summon_root')) {
            const level = skillManager.getSkillLevel('summon_root');
            this.currentLevel = level;
            this.hasSkill = true;

            // 获取技能数值
            const stats = skillManager.getSkillStat('summon_root', level);
            if (stats) {
                this.summonCount = stats.summonCount || 1;
            }

            // 获取玩家攻击力和移动速度作为仆从属性
            const player = this.node.getComponent('PlayerController') as any;
            this.summonDamage = player?.getAttack?.() || 30;
            this.playerSpeed = player?.getSpeed?.() || 300;

            // 重新召唤
            this.resummonAll();

            console.log(`[灵木之仆] 技能等级 ${level}，召唤数量 ${this.summonCount}，仆从伤害 ${this.summonDamage}，玩家速度 ${this.playerSpeed}`);
        } else {
            this.hasSkill = false;
            this.removeAllMinions();
        }
    }

    /**
     * 重新召唤所有仆从
     */
    private resummonAll() {
        this.removeAllMinions();

        if (!this.hasSkill) return;

        // 延迟召唤，确保玩家位置已确定
        this.scheduleOnce(() => {
            for (let i = 0; i < this.summonCount; i++) {
                this.summonMinion(i);
            }
        }, 0.1);
    }

    /**
     * 召唤一个仆从
     * @param index 仆从索引（用于环形分布）
     */
    private summonMinion(index: number) {
        if (!this.minionPrefab) {
            console.warn('[灵木之仆] 仆从预制体未设置');
            return;
        }

        // 获取玩家节点的世界坐标
        const playerNode = this.node;
        const playerWorldPos = playerNode.worldPosition;

        // 获取 Canvas 的世界坐标作为参考
        const canvas = this.node.scene?.getChildByName('Canvas');
        const canvasWorldPos = canvas?.worldPosition || new Vec3(0, 0, 0);

        // 计算相对于 Canvas 的偏移
        const offsetX = playerWorldPos.x - canvasWorldPos.x;
        const offsetY = playerWorldPos.y - canvasWorldPos.y;

        const angle = (index / this.summonCount) * Math.PI * 2;
        const radius = 80;
        const spawnOffsetX = Math.cos(angle) * radius;
        const spawnOffsetY = Math.sin(angle) * radius;

        // 生成位置 = 玩家偏移 + 角度偏移
        const spawnX = offsetX + spawnOffsetX;
        const spawnY = offsetY + spawnOffsetY;

        const minion = instantiate(this.minionPrefab);

        // 挂载到 Canvas，使用相对于 Canvas 的位置
        minion.setParent(canvas);
        minion.setPosition(spawnX, spawnY, 0);

        const rootMinion = minion.getComponent(RootMinion);
        if (rootMinion) {
            // 传递玩家攻击力和移动速度
            rootMinion.init(this.summonDamage, this.playerSpeed);
        }

        this.minions.push(minion);
    }

    /**
     * 移除所有仆从
     */
    private removeAllMinions() {
        for (const minion of this.minions) {
            if (minion && minion.isValid) {
                minion.destroy();
            }
        }
        this.minions = [];
    }

    /**
     * 获取当前仆从数量
     */
    public getMinionCount(): number {
        return this.minions.filter(m => m && m.isValid).length;
    }

    /**
     * 重置技能
     */
    public reset() {
        this.removeAllMinions();
        this.hasSkill = false;
        this.currentLevel = 0;
    }

    protected onDestroy() {
        this.removeAllMinions();
    }

    update(deltaTime: number) {
        if (!this.hasSkill) return;

        // 检查游戏是否暂停
        const stateMachine = this.getService<GameStateMachine>('stateMachine');
        if (stateMachine && stateMachine.isPaused()) {
            return;
        }

        // 清理已死亡的仆从
        this.minions = this.minions.filter(m => m && m.isValid);

        // 如果仆从数量不足，等待重新召唤
        if (this.minions.length < this.summonCount) {
            this.spawnTimer += deltaTime;
            if (this.spawnTimer >= this.spawnInterval) {
                this.spawnTimer = 0;
                this.resummonAll();
            }
        } else {
            this.spawnTimer = 0;
        }
    }
}