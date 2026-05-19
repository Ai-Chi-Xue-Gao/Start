import { Vec3 } from 'cc';
import { PlayerController } from '../entities/player/PlayerController';
import { Enemy } from '../entities/enemy/Enemy';
import { EventBus } from '../core/EventBus';
import { EventNames } from '../utils/EventNames';

/**
 * 效果类型枚举
 */
export type EffectType = 
    | 'modifyStat'          // 修改属性
    | 'applyBuff'           // 应用Buff
    | 'dealDamage'          // 造成伤害
    | 'dealAreaDamage'      // 范围伤害
    | 'heal'                // 治疗
    | 'revive'              // 复活
    | 'teleport'            // 瞬移
    | 'dodge'               // 闪避
    | 'convertStat'         // 属性转换
    | 'spawnProjectile'     // 生成投射物
    | 'repeatCast'          // 重复施法
    | 'modifyProjectile'    // 修改投射物
    | 'createShield'        // 创建护盾
    | 'slowEnemy'           // 减速敌人
    | 'freezeEnemy'         // 冰冻敌人
    | 'pullEnemy';          // 吸引敌人

/**
 * 效果执行上下文
 */
export interface EffectContext {
    player: PlayerController      // 玩家控制器
    target?: any                   // 目标（敌人节点）
    position?: Vec3                // 位置
    source?: any                   // 来源（技能ID等）
}

/**
 * 效果参数
 */
export interface EffectParams {
    stat?: string                  // 属性名
    value?: number                 // 数值
    duration?: number              // 持续时间（秒）
    additive?: boolean             // 是否叠加
    radius?: number                // 半径
    damage?: number                // 伤害值
    damagePercent?: number         // 伤害百分比（相对于攻击力）
    healPercent?: number           // 治疗百分比
    hpPercent?: number             // 复活生命百分比
    count?: number                 // 数量
    delay?: number                 // 延迟
    buffId?: string                // Buff ID
    projectileId?: string          // 投射物ID
    slowPercent?: number           // 减速百分比
    freezeDuration?: number        // 冰冻持续时间
    pullRadius?: number            // 吸引半径
    fromStat?: string              // 来源属性（转换用）
    toStat?: string                // 目标属性（转换用）
    ratio?: number                 // 转换比例
    condition?: Record<string, any> // 条件
    [key: string]: any
}

/**
 * 效果执行器
 * 负责执行具体的技能效果
 */
export class EffectSystem {
    
    /**
     * 执行效果
     * @param effectType 效果类型
     * @param params 效果参数
     * @param context 执行上下文
     */
    public static execute(effectType: EffectType, params: EffectParams, context: EffectContext): void {
        switch (effectType) {
            case 'modifyStat':
                this.modifyStat(params, context);
                break;
            case 'applyBuff':
                this.applyBuff(params, context);
                break;
            case 'dealDamage':
                this.dealDamage(params, context);
                break;
            case 'dealAreaDamage':
                this.dealAreaDamage(params, context);
                break;
            case 'heal':
                this.heal(params, context);
                break;
            case 'revive':
                this.revive(params, context);
                break;
            case 'teleport':
                this.teleport(params, context);
                break;
            case 'dodge':
                this.dodge(params, context);
                break;
            case 'convertStat':
                this.convertStat(params, context);
                break;
            case 'spawnProjectile':
                this.spawnProjectile(params, context);
                break;
            case 'repeatCast':
                this.repeatCast(params, context);
                break;
            case 'modifyProjectile':
                this.modifyProjectile(params, context);
                break;
            case 'createShield':
                this.createShield(params, context);
                break;
            case 'slowEnemy':
                this.slowEnemy(params, context);
                break;
            case 'freezeEnemy':
                this.freezeEnemy(params, context);
                break;
            case 'pullEnemy':
                this.pullEnemy(params, context);
                break;
            default:
                console.warn(`[EffectSystem] 未注册的效果类型: ${effectType}`);
        }
    }

    // ========== 属性修改 ==========
    
    /**
     * 修改玩家属性
     */
    private static modifyStat(params: EffectParams, context: EffectContext): void {
        const { stat, value, duration, additive } = params;
        const player = context.player;
        
        if (!player) return;
        
        if (duration && duration > 0) {
            // 临时效果
            this.applyTemporaryStat(player, stat, value, duration);
        } else {
            // 永久效果
            this.applyPermanentStat(player, stat, value, additive);
        }
        
        console.log(`[EffectSystem] 修改属性: ${stat} = ${value}, 持续时间: ${duration || '永久'}`);
    }
    
    /**
     * 应用永久属性修改
     */
    private static applyPermanentStat(player: PlayerController, stat: string, value: number, additive?: boolean): void {
        switch (stat) {
            case 'attackMultiplier':
                player.addAttackMultiplier(value);
                break;
            case 'speedMultiplier':
                player.addSpeedMultiplier(value);
                break;
            case 'expBonus':
                player.addExpBonus(value);
                break;
            case 'cooldownReduction':
                player.addCooldownReduction(value);
                break;
            case 'magnetBonus':
                player.addMagnetBonus(value);
                break;
            case 'vampirePercent':
                player.addVampirePercent(value);
                break;
            case 'damageReduction':
                player.addDamageReduction(value);
                break;
            case 'critChance':
                player.addCritChance(value);
                break;
            case 'critDamage':
                player.addCritDamage(value);
                break;
            case 'armorPen':
                player.addArmorPen(value);
                break;
            case 'thornDamage':
                player.addThornDamage(value);
                break;
            case 'healthBonus':
                player.addPermanentHealth(value);
                break;
            case 'attackBonus':
                player.addPermanentAttack(value);
                break;
            case 'speedBonusPercent':
                player.addPermanentSpeed(value);
                break;
            case 'cooldownBonus':
                player.addPermanentCooldown(value);
                break;
            case 'expBonusPercent':
                player.addPermanentExp(value);
                break;
            default:
                console.warn(`[EffectSystem] 未知的永久属性: ${stat}`);
        }
    }
    
    /**
     * 应用临时属性修改（TODO: 实现临时Buff系统）
     */
    private static applyTemporaryStat(player: PlayerController, stat: string, value: number, duration: number): void {
        // TODO: 实现临时Buff系统
        console.log(`[EffectSystem] 临时属性（待实现）: ${stat} +${value}，持续 ${duration}秒`);
    }

    // ========== Buff 系统 ==========
    
    /**
     * 应用Buff
     */
    private static applyBuff(params: EffectParams, context: EffectContext): void {
        const { buffId, value, duration } = params;
        const target = context.target || context.player;
        
        console.log(`[EffectSystem] 应用Buff: ${buffId}, 值: ${value}, 持续时间: ${duration}秒`);
        // TODO: 实现完整的Buff系统
    }

    // ========== 伤害系统 ==========
    
    /**
     * 对单个目标造成伤害
     */
    private static dealDamage(params: EffectParams, context: EffectContext): void {
        const { value, damagePercent, kill } = params;
        const target = context.target;
        
        if (!target || !target.takeDamage) {
            console.warn('[EffectSystem] 目标无效或无 takeDamage 方法');
            return;
        }
        
        // 计算伤害值
        let damage: number;
        if (damagePercent) {
            // 百分比伤害（相对于玩家攻击力）
            damage = context.player.getAttack() * damagePercent;
        } else {
            damage = value || 0;
        }
        
        if (damage <= 0) return;
        
        // 造成伤害
        target.takeDamage(damage);
        
        // 斩杀效果
        if (kill && target.currentHealth <= 0) {
            console.log(`[EffectSystem] 斩杀触发，直接击杀`);
        }
        
        console.log(`[EffectSystem] 造成伤害: ${damage}`);
    }
    
    /**
     * 范围伤害
     */
    private static dealAreaDamage(params: EffectParams, context: EffectContext): void {
        const { value, damagePercent, radius } = params;
        const player = context.player;
        const position = context.position || player.node.worldPosition;
        
        console.log(`[EffectSystem] 范围伤害: ${value || damagePercent}, 半径: ${radius}`);
        // TODO: 查找半径内的敌人并造成伤害
        EventBus.emit('area_damage', { position, radius, damage: value, damagePercent });
    }

    // ========== 治疗系统 ==========
    
    /**
     * 治疗玩家
     */
    private static heal(params: EffectParams, context: EffectContext): void {
        const { value, healPercent } = params;
        const player = context.player;
        
        if (!player) return;
        
        let healAmount: number;
        if (healPercent) {
            healAmount = player.getMaxHealth() * healPercent;
        } else {
            healAmount = value || 0;
        }
        
        if (healAmount > 0) {
            player.heal(healAmount);
            console.log(`[EffectSystem] 治疗: ${healAmount}`);
        }
    }
    
    /**
     * 复活玩家
     */
    private static revive(params: EffectParams, context: EffectContext): void {
        const { hpPercent } = params;
        const player = context.player;
        
        if (!player) return;
        
        player.revive(hpPercent || 0.5);
        console.log(`[EffectSystem] 复活，生命值: ${(hpPercent || 0.5) * 100}%`);
    }

    // ========== 移动系统 ==========
    
    /**
     * 瞬移
     */
    private static teleport(params: EffectParams, context: EffectContext): void {
        const { radius } = params;
        const player = context.player;
        
        if (!player) return;
        
        const randomX = (Math.random() - 0.5) * (radius || 300) * 2;
        const randomY = (Math.random() - 0.5) * (radius || 300) * 2;
        player.node.setPosition(randomX, randomY, 0);
        
        console.log(`[EffectSystem] 瞬移到 (${randomX.toFixed(0)}, ${randomY.toFixed(0)})`);
    }
    
    /**
     * 闪避
     */
    private static dodge(params: EffectParams, context: EffectContext): void {
        const { chance } = params;
        console.log(`[EffectSystem] 闪避率: ${(chance || 0) * 100}%`);
        // 闪避逻辑在 PlayerController 的受伤方法中实现
    }

    // ========== 属性转换 ==========
    
    /**
     * 属性转换
     */
    private static convertStat(params: EffectParams, context: EffectContext): void {
        const { fromStat, toStat, ratio } = params;
        const player = context.player;
        
        if (!player) return;
        
        // 获取来源属性的值
        const fromValue = this.getStatValue(player, fromStat);
        const converted = fromValue * (ratio || 0.5);
        
        this.applyPermanentStat(player, toStat, converted, true);
        console.log(`[EffectSystem] 属性转换: ${fromStat}(${fromValue}) -> ${toStat}(${converted})`);
    }
    
    /**
     * 获取属性值（辅助方法）
     */
    private static getStatValue(player: PlayerController, statName: string): number {
        switch (statName) {
            case 'attack':
            case 'attackMultiplier':
                return player.getAttack();
            case 'speed':
            case 'speedMultiplier':
                return player.getSpeed();
            case 'maxHealth':
                return player.getMaxHealth();
            case 'currentHealth':
                return player.getCurrentHealth();
            case 'exp':
                return player.getExp();
            case 'level':
                return player.getLevel();
            case 'expBonus':
            case 'expMultiplier':
                return player.getExpMultiplier();
            case 'cooldownReduction':
                return player.getAttackCooldownReduction();
            case 'magnetBonus':
            case 'magnetRange':
                return player.getMagnetRangeMultiplier();
            case 'fireballSpeedMultiplier':
                return player.getFireballSpeedMultiplier();
            case 'vampirePercent':
                return player.getSkill()?.getVampirePercent() || 0;
            case 'critChance':
                return player.getSkill()?.getCritChance() || 0;
            case 'critDamage':
                return player.getSkill()?.getCritDamage() || 0;
            default:
                console.warn(`[EffectSystem] 未知的属性: ${statName}`);
                return 0;
        }
    }

    // ========== 投射物系统 ==========
    
    /**
     * 生成投射物
     */
    private static spawnProjectile(params: EffectParams, context: EffectContext): void {
        const { projectileId, damage, radius } = params;
        const player = context.player;
        
        console.log(`[EffectSystem] 生成投射物: ${projectileId}, 伤害: ${damage}, 半径: ${radius}`);
        // TODO: 生成火球、陨石等投射物
        EventBus.emit('spawn_projectile', { projectileId, damage, radius, source: context.source });
    }
    
    /**
     * 重复施法
     */
    private static repeatCast(params: EffectParams, context: EffectContext): void {
        const { count, delay } = params;
        console.log(`[EffectSystem] 重复施法 ${count} 次，间隔 ${delay}秒`);
        // TODO: 实现重复施法逻辑
    }
    
    /**
     * 修改投射物属性
     */
    private static modifyProjectile(params: EffectParams, context: EffectContext): void {
        const { stat, value } = params;
        console.log(`[EffectSystem] 修改投射物: ${stat} = ${value}`);
        // 投射物修改在 FireBall 生成时读取玩家属性实现
    }

    // ========== 护盾系统 ==========
    
    /**
     * 创建护盾
     */
    private static createShield(params: EffectParams, context: EffectContext): void {
        const { value, duration } = params;
        const player = context.player;
        
        console.log(`[EffectSystem] 创建护盾: ${value}点，持续 ${duration}秒`);
        // TODO: 实现护盾系统
    }

    // ========== 控制效果 ==========
    
    /**
     * 减速敌人
     */
    private static slowEnemy(params: EffectParams, context: EffectContext): void {
        const { slowPercent, duration } = params;
        const target = context.target;
        
        if (!target) return;
        
        console.log(`[EffectSystem] 减速敌人: ${(slowPercent || 0) * 100}%，持续 ${duration}秒`);
        // 减速逻辑在 Enemy 中实现
    }
    
    /**
     * 冰冻敌人
     */
    private static freezeEnemy(params: EffectParams, context: EffectContext): void {
        const { duration } = params;
        const target = context.target;
        
        if (!target) return;
        
        console.log(`[EffectSystem] 冰冻敌人，持续 ${duration}秒`);
        // 冰冻逻辑在 Enemy 中实现
    }
    
    /**
     * 吸引敌人
     */
    private static pullEnemy(params: EffectParams, context: EffectContext): void {
        const { radius } = params;
        const player = context.player;
        const position = player.node.worldPosition;
        
        console.log(`[EffectSystem] 吸引敌人，半径: ${radius}`);
        EventBus.emit('pull_enemy', { position, radius });
    }
}