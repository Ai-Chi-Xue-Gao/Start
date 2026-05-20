// assets/scripts/services/SkillService.ts

import { ServiceLocator } from '../core/ServiceLocator';
import { EventBus } from '../core/EventBus';
import { EventNames } from '../utils/EventNames';
import { GameState, GameStateMachine } from '../core/GameStateMachine';
import { SkillManager } from '../Managers/SkillManager';

/**
 * 技能服务
 * 职责：技能学习、升级、合成、技能池管理
 */
export class SkillService {
    private static instance: SkillService;
    private skillManager: SkillManager | null = null;

    private constructor() {}

    static getInstance(): SkillService {
        if (!SkillService.instance) {
            SkillService.instance = new SkillService();
        }
        return SkillService.instance;
    }

    /**
     * 初始化（注册服务到 ServiceLocator）
     */
    public init() {
        ServiceLocator.getInstance().register('skillService', this);
        this.skillManager = SkillManager.getInstance();
        console.log('[SkillService] 初始化完成');
    }

    /**
     * 获取技能管理器
     */
    private getSkillManager(): SkillManager {
        if (!this.skillManager) {
            this.skillManager = SkillManager.getInstance();
        }
        return this.skillManager;
    }

    /**
     * 检查是否可以学习/升级技能
     */
    public canLearnSkill(skillId: string): boolean {
        const stateMachine = ServiceLocator.getInstance().get<GameStateMachine>('stateMachine');
        if (stateMachine && stateMachine.getState() !== GameState.RUNNING) {
            return false;
        }
        return this.getSkillManager().canUpgradeSkill(skillId);
    }

    /**
     * 学习或升级技能
     */
    public learnSkill(skillId: string): boolean {
        const result = this.getSkillManager().learnSkill(skillId);
        
        if (result) {
            // 触发升级面板关闭
            const stateMachine = ServiceLocator.getInstance().get<GameStateMachine>('stateMachine');
            stateMachine?.exitLevelUp();
        }
        
        return result;
    }

    /**
     * 获取随机技能列表（用于升级面板）
     */
    public getRandomSkills(count: number, excludeIds: string[] = []): string[] {
        return this.getSkillManager().getRandomSkills(count, excludeIds);
    }

    /**
     * 获取可用合成技能
     */
    public getAvailableFusions(): { fusionId: string; name: string; description: string }[] {
        const fusions = this.getSkillManager().getAvailableFusions();
        return fusions.map(f => ({
            fusionId: f.fusionId,
            name: f.rule.name,
            description: f.rule.description
        }));
    }

    /**
     * 合成技能
     */
    public fuseSkill(fusionId: string): boolean {
        const result = this.getSkillManager().fuseSkill(fusionId);
        
        if (result) {
            console.log(`[SkillService] 合成成功: ${fusionId}`);
        }
        
        return result;
    }

    /**
     * 获取技能当前等级
     */
    public getSkillLevel(skillId: string): number {
        return this.getSkillManager().getSkillLevel(skillId);
    }

    /**
     * 获取技能最大等级
     */
    public getSkillMaxLevel(skillId: string): number {
        return this.getSkillManager().getSkillMaxLevel(skillId);
    }

    /**
     * 获取技能定义
     */
    public getSkillDef(skillId: string) {
        return this.getSkillManager().getSkillDef(skillId);
    }

    /**
     * 获取玩家已学技能
     */
    public getPlayerSkills() {
        return this.getSkillManager().getPlayerSkills();
    }

    /**
     * 检查技能是否已学习
     */
    public hasSkill(skillId: string): boolean {
        return this.getSkillManager().hasSkill(skillId);
    }

    /**
     * 重置技能系统（新游戏时）
     */
    public reset() {
        this.getSkillManager().reset();
        console.log('[SkillService] 技能系统已重置');
    }
}