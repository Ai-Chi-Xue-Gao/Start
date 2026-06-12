// assets/scripts/managers/SkillFactory.ts

import { Node } from 'cc';
import { GenericSkill } from '../skills/GenericSkill';
import { SkillManager } from '../../Managers/SkillManager';
import { PoolManager } from '../../utils/PoolManager';

/**
 * 技能工厂
 * 负责：创建和管理技能组件
 */
export class SkillFactory {
    private static instance: SkillFactory;
    private skillCache: Map<string, GenericSkill> = new Map();

    private constructor() {}

    static getInstance(): SkillFactory {
        if (!SkillFactory.instance) {
            SkillFactory.instance = new SkillFactory();
        }
        return SkillFactory.instance;
    }

    /**
     * 为玩家添加技能
     * @param playerNode 玩家节点
     * @param skillId 技能ID
     * @param level 技能等级
     */
    public addSkillToPlayer(playerNode: Node, skillId: string, level: number): GenericSkill | null {
        const skillManager = SkillManager.getInstance();
        const def = skillManager.getSkillDef(skillId);

        if (!def) {
            console.warn(`[SkillFactory] 技能不存在: ${skillId}`);
            return null;
        }

        // 检查是否已有该技能组件
        let skillComp = this.skillCache.get(skillId);
        if (skillComp && skillComp.node && skillComp.node.isValid) {
            // 升级现有技能
            skillComp.init(skillId, level);
            console.log(`[SkillFactory] 技能升级: ${skillId} -> Lv.${level}`);
            return skillComp;
        }

        // 创建技能组件
        skillComp = playerNode.addComponent(GenericSkill);
        
        // 从 PoolManager 获取预制体并设置
        const poolManager = PoolManager.getInstance();
        if (poolManager) {
            skillComp.defaultAreaPrefab = poolManager.getElementRingPrefab();
        }
        
        skillComp.init(skillId, level);
        this.skillCache.set(skillId, skillComp);
        console.log(`[SkillFactory] 技能添加: ${skillId} Lv.${level}`);
        return skillComp;
    }

    /**
     * 移除技能
     */
    public removeSkill(skillId: string): void {
        const skillComp = this.skillCache.get(skillId);
        if (skillComp && skillComp.node && skillComp.node.isValid) {
            skillComp.deactivate();
            skillComp.destroy();
            this.skillCache.delete(skillId);
            console.log(`[SkillFactory] 技能移除: ${skillId}`);
        }
    }

    /**
     * 升级技能
     */
    public upgradeSkill(skillId: string, newLevel: number): void {
        const skillComp = this.skillCache.get(skillId);
        if (skillComp && skillComp.node && skillComp.node.isValid) {
            skillComp.init(skillId, newLevel);
            console.log(`[SkillFactory] 技能升级: ${skillId} -> Lv.${newLevel}`);
        }
    }

    /**
     * 清除所有技能
     */
    public clearAllSkills(): void {
        for (const [skillId, skillComp] of this.skillCache) {
            if (skillComp && skillComp.node && skillComp.node.isValid) {
                skillComp.deactivate();
                skillComp.destroy();
            }
        }
        this.skillCache.clear();
        console.log('[SkillFactory] 所有技能已清除');
    }

    /**
     * 获取技能数量
     */
    public getSkillCount(): number {
        return this.skillCache.size;
    }

    /**
     * 检查是否拥有某个技能
     */
    public hasSkill(skillId: string): boolean {
        return this.skillCache.has(skillId);
    }

    /**
     * 获取技能组件
     */
    public getSkill(skillId: string): GenericSkill | null {
        return this.skillCache.get(skillId) || null;
    }
}