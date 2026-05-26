// assets/scripts/gameplay/player/WaterOrbManager.ts

import { _decorator, Node, Prefab, instantiate } from 'cc';
import { BaseComponent } from '../../core/BaseComponent';
import { WaterOrb } from '../projectile/WaterOrb';
import { ObjectPool } from '../../utils/ObjectPool';
import { SkillManager } from '../../Managers/SkillManager';

const { ccclass, property } = _decorator;

/**
 * 水灵法球管理器
 */
@ccclass('WaterOrbManager')
export class WaterOrbManager extends BaseComponent {
    @property(Node)
    playerNode: Node = null;           // 玩家节点
    
    @property(Prefab)
    waterOrbPrefab: Prefab = null;     // 法球预制体
    
    private orbs: WaterOrb[] = [];
    private currentOrbCount: number = 0;
    private hasSkill: boolean = false;
    private orbDamage: number = 20;
    
    start() {
        if (this.playerNode) {
            this.initSkillStatus()
        }
    }
    
    /**
     * 初始化技能状态
     */
    private initSkillStatus() {
        const skillManager = SkillManager.getInstance()
        if (skillManager && skillManager.hasSkill('water_orb')) {
            this.updateSkillStatus()
        }
    }
    
    /**
     * 更新技能状态（技能学习/升级时调用）
     */
    public updateSkillStatus() {
        const skillManager = SkillManager.getInstance()
        
        if (skillManager && skillManager.hasSkill('water_orb')) {
            const level = skillManager.getSkillLevel('water_orb')
            this.hasSkill = true
            
            // 获取法球数量
            const stats = skillManager.getSkillStat('water_orb', level)
            const targetCount = stats?.orbCount || 2
            
            // 获取伤害值（从玩家攻击力计算）
            const player = this.playerNode?.getComponent('PlayerController') as any
            this.orbDamage = player?.getAttack?.() || 20
            
            // 更新法球数量
            this.setOrbCount(targetCount)
            
            console.log(`[水灵法球] 技能等级 ${level}，法球数量 ${targetCount}，伤害 ${this.orbDamage}`)
        } else {
            this.hasSkill = false
            this.setOrbCount(0)
        }
    }
    
    /**
     * 设置法球数量
     */
    private setOrbCount(count: number) {
        if (count === this.currentOrbCount) return
        
        // 移除多余的法球
        while (this.orbs.length > count) {
            const orb = this.orbs.pop()
            if (orb && orb.node.isValid) {
                orb.node.destroy()
            }
        }
        
        // 添加缺少的法球
        while (this.orbs.length < count) {
            this.addOrb()
        }
        
        this.currentOrbCount = count
        this.recalculateOrbPositions()
    }
    
    /**
     * 添加一个新法球
     */
    private addOrb() {
        const pool = ObjectPool.getInstance()
        let orbNode = pool.get('waterOrb', this.node)
        
        if (!orbNode) {
            if (!this.waterOrbPrefab) return
            orbNode = instantiate(this.waterOrbPrefab)
            this.node.addChild(orbNode)
        }
        
        const orb = orbNode.getComponent(WaterOrb)
        if (orb) {
            const angleStep = 360 / (this.orbs.length + 1)
            const startAngle = (this.orbs.length * angleStep)
            orb.init(this.playerNode, startAngle, 80, this.orbDamage)
            this.orbs.push(orb)
        }
    }
    
    /**
     * 重新计算所有法球位置（当数量变化时）
     */
    private recalculateOrbPositions() {
        const count = this.orbs.length
        if (count === 0) return
        
        const angleStep = 360 / count
        for (let i = 0; i < count; i++) {
            const angle = i * angleStep
            this.orbs[i].setAngle(angle)
        }
    }
    
    /**
     * 每帧更新法球位置
     */
    update(deltaTime: number) {
        if (!this.hasSkill) return
        
        for (const orb of this.orbs) {
            if (orb && orb.node.isValid) {
                orb.updateOrbit(deltaTime)
            }
        }
    }
    
    /**
     * 重置（新游戏时调用）
     */
    public reset() {
        this.setOrbCount(0)
        this.hasSkill = false
        this.currentOrbCount = 0
    }
}