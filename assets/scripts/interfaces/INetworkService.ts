/**
 * 网络服务接口
 * 定义 gameplay 模块需要访问的网络能力
 * 放置在主包中，供各分包通过 ServiceLocator 调用
 */
export interface INetworkService {
    // 连接状态
    isConnected(): boolean
    
    // 发送移动
    setMove(x: number, y: number): void
    
    // 发送攻击
    sendAttack(enemyId: string, damage: number): void
    
    // 发送受伤
    sendHurt(damage: number, currentHp: number, maxHp: number): void
    
    // 发送升级
    sendLevelUp(level: number): void
    
    // 发送经验更新
    sendExpUpdate(exp: number, expToNextLevel: number, level: number): void
}