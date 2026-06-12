// assets/scripts/services/SkillService.ts

import { ServiceLocator } from '../core/ServiceLocator';
import { GameState, GameStateMachine } from '../core/GameStateMachine';
import { SkillManager } from '../Managers/SkillManager';
import { SkillFactory } from '../gameplay/managers/SkillFactory';

/**
 * 技能服务
 * 职责：技能学习、升级、技能池管理
 */
export class SkillService {
    private static instance: SkillService;
    private skillManager: SkillManager | null = null;
    private skillFactory: SkillFactory | null = null;

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
    public init(): void {
        ServiceLocator.getInstance().register('skillService', this);
        this.skillManager = SkillManager.getInstance();
        this.skillFactory = SkillFactory.getInstance();
        console.log('[SkillService] 初始化完成');
    }

    /**
     * 检查是否可以学习/升级技能
     */
    public canLearnSkill(skillId: string): boolean {
        const stateMachine = ServiceLocator.getInstance().get<GameStateMachine>('stateMachine');
        if (stateMachine && stateMachine.getState() !== GameState.RUNNING) {
            return false;
        }
        return this.skillManager!.canUpgradeSkill(skillId);
    }

    /**
     * 学习或升级技能
     */
    public learnSkill(skillId: string): boolean {
        const result = this.skillManager!.learnSkill(skillId);
        
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
        return this.skillManager!.getRandomSkills(count, excludeIds);
    }

    /**
     * 获取技能当前等级
     */
    public getSkillLevel(skillId: string): number {
        return this.skillManager!.getSkillLevel(skillId);
    }

    /**
     * 获取技能最大等级
     */
    public getSkillMaxLevel(skillId: string): number {
        return this.skillManager!.getSkillMaxLevel(skillId);
    }

    /**
     * 获取技能定义
     */
    public getSkillDef(skillId: string) {
        return this.skillManager!.getSkillDef(skillId);
    }

    /**
     * 获取玩家已学技能
     */
    public getPlayerSkills() {
        return this.skillManager!.getPlayerSkills();
    }

    /**
     * 检查技能是否已学习
     */
    public hasSkill(skillId: string): boolean {
        return this.skillManager!.hasSkill(skillId);
    }

    /**
     * 重置技能系统（新游戏时）
     */
    public reset(): void {
        this.skillManager!.reset();
        this.skillFactory?.clearAllSkills();
    }
}