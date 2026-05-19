import { _decorator, Component } from 'cc';
import { EventBus } from '../../core/EventBus';
import { EventNames } from '../../utils/EventNames';
import { GameConstants } from '../../utils/GameConstants';

const { ccclass, property } = _decorator;

/**
 * 玩家经验组件
 * 负责：经验获取、升级
 */
@ccclass('PlayerExperience')
export class PlayerExperience extends Component {
    private exp: number = 0
    private expToNextLevel: number = GameConstants.BASE_EXP_TO_NEXT_LEVEL
    private expMultiplier: number = GameConstants.BASE_EXP_MULTIPLIER
    private currentLevel: number = 1
    
    // 加成属性
    private expBonus: number = 0
    private permanentExpBonus: number = 1.0

    start() {
        EventBus.on(EventNames.GAIN_EXP, this.onGainExp, this)
    }

    protected onDestroy() {
        EventBus.off(EventNames.GAIN_EXP, this.onGainExp, this)
    }

    private onGainExp(value: number) {
        const actualExp = Math.floor(value * this.getExpMultiplier())
        this.exp += actualExp

        if (this.exp >= this.expToNextLevel) {
            this.levelUP()
        }

        EventBus.emit(EventNames.EXP_CHANGED, this.exp, this.expToNextLevel)
    }

    private levelUP() {
        this.exp -= this.expToNextLevel
        this.expToNextLevel = Math.floor(this.expToNextLevel * GameConstants.EXP_GROWTH_FACTOR)
        this.currentLevel++
        
        EventBus.emit(EventNames.PLAYER_LEVEL_UP, { fromLevelUp: true })
    }

    public getExp(): number {
        return this.exp
    }

    public getExpToNextLevel(): number {
        return this.expToNextLevel
    }

    public getLevel(): number {
        return this.currentLevel
    }

    public getExpMultiplier(): number {
        let multiplier = this.expMultiplier + this.expBonus
        multiplier = multiplier * this.permanentExpBonus
        return Math.max(GameConstants.MIN_EXP_MULTIPLIER, multiplier)
    }

    public addExpBonus(value: number) {
        this.expBonus += value
    }

    public addPermanentExp(bonusPercent: number) {
        this.permanentExpBonus += bonusPercent
    }

    public setExpMultiplier(value: number) {
        this.expMultiplier = value
    }
}