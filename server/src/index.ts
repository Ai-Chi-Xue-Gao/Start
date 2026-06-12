import { WebSocketServer, WebSocket } from "ws";

// 定义玩家数据结构
interface Player{
    id: string;
    ws: WebSocket;
    x: number;
    y: number;
    name: string;
    hp: number;
    maxHp: number;
    level: number;
    exp: number;
    expToNextLevel: number;
}

// 敌人数据结构
interface EnemyData{
    id: string;
    x: number;
    y: number;
    hp: number;
    maxHp: number;
    type: EnemyType;
    level: number;
}

// 存储所有敌人
let enemies: Map<string, EnemyData> = new Map();
let nextEnemyId = 1;

// 根据时间决定敌人类型
let lastEliteTime: number = Date.now();
let lastBossTime: number = Date.now();
const ELITE_INTERVAL = 60000;
const BOSS_INTERVAL = 180000;
type EnemyType = 'normal' | 'elite' | 'boss'

// 定义消息类型
interface Message{
    type: string;
    data?: any;
    playerId?: string;
}

// 敌人类型
const EnemyConfig: Record<EnemyType, {hp: number; maxHp: number; damage: number; exp: number; color: string; scale: number}> = {
    normal: {hp: 30, maxHp: 30, damage: 10, exp: 10, color: '#FFFFFF', scale: 1.0},
    elite: {hp: 80, maxHp: 80, damage: 20, exp: 30, color: '#333333', scale: 1.3},
    boss: {hp: 200, maxHp: 200, damage: 200, exp: 40, color: '#FFD700', scale: 2.0}
}

// 服务器配置
const PORT = 8080;
const wss = new WebSocketServer({port: PORT})

// 存储所有在线玩家
const players: Map<string, Player> = new Map();


// 广播给所有玩家（除发送者外）
function broadcast(type: string, data: any, excludeId?: string){
    const message = JSON.stringify({type, data})
    players.forEach((player, id) => {
        if(id !== excludeId && player.ws.readyState === WebSocket.OPEN){
            player.ws.send(message)
        }
    })
}

// 广播给所有玩家（包括发送者）
function broadcastAll(type: string, data: any){
    const message = JSON.stringify({type, data})
    players.forEach((player) => {
        if(player.ws.readyState === WebSocket.OPEN){
            player.ws.send(message)
        }
    })
}

// 处理玩家连接
wss.on('connection', (ws: WebSocket, req) => {
    // 生成唯一ID
    const playerId = Date.now().toString() + Math.random().toString(36).substring(2, 8)


    // 新玩家加入
    const newPlayer: Player = {
        id: playerId,
        ws,
        x: Math.random() * 800 - 400,
        y: Math.random() * 600 - 300,
        name: `玩家_${playerId.slice(-4)}`,
        hp: 100,
        maxHp: 100,
        level: 1,
        exp: 0,
        expToNextLevel: 100,
    }
    players.set(playerId, newPlayer)

    // 1.发送当前游戏状态给新玩家
    const allPlayersData = Array.from(players.values()).filter(p => p.id !== playerId).map(p => ({
        id: p.id,
        x: p.x,
        y: p.y,
        name: p.name,
        hp: p.hp,
        maxHp: p.maxHp,
        level: p.level,
        exp: p.exp,
        expToNextLevel: p.expToNextLevel,
    }))
    ws.send(JSON.stringify({
        type: 'init',
        data: {
            players: allPlayersData,
            yourId: playerId,
            enemies: Array.from(enemies.values()), // 添加现有敌人列表给新玩家
        }
    }))

    // 2.广播新玩家加入给其他玩家
    broadcast('player_joined', {
        id: playerId,
        x: newPlayer.x,
        y: newPlayer.y,
        name: newPlayer.name,
    }, playerId)

    // 处理客户端消息
    ws.on('message', (rawData: Buffer) => {
        try{
            const message: Message = JSON.parse(rawData.toString())

            switch(message.type){
                case 'move':{
                    // 更新玩家位置
                    const player = players.get(playerId)
                    if(player && message.data){
                        player.x = message.data.x
                        player.y = message.data.y

                        // 广播位置更新给所有其他玩家
                        broadcast('player_moved', {
                            id: playerId,
                            x: player.x,
                            y: player.y,
                        }, playerId)
                    }
                    break
                }
                
                case 'chat':{
                    // 广播聊天消息
                    broadcastAll('chat', {
                        playerId,
                        name:players.get(playerId)?.name,
                        message: message.data,
                    })
                    break
                }

                // 处理火球击中敌人
                // 在move消息处理之后添加
                case 'attack':{
                    const enemyId = message.data.enemyId;
                    const damage = message.data.damage;
                    const enemy = enemies.get(enemyId);
                    if(enemy){
                        const config = EnemyConfig[enemy.type];
                        enemy.hp -= damage
                        if(enemy.hp <= 0){
                            enemies.delete(enemyId);
                            broadcastAll('enemy_dead', {id: enemyId})
                            // 给攻击者加经验
                            broadcastAll('enemy_exp', {id: enemyId, exp: config.exp})
                        }else{
                            broadcastAll('enemy_hp', {id: enemyId, hp: enemy.hp})
                        }
                    }
                    break;
                }

                case 'hurt':{
                    // 玩家受到伤害
                    const hurtPlayerId = message.data.playerId;
                    const damage = message.data.damage;
                    const currentHp = message.data.currentHp;
                    const maxHp = message.data.maxHp;

                    const player = players.get(hurtPlayerId);
                    if(player){
                        player.hp = message.data.currentHp;
                    }

                    // 广播给所有其他玩家（不包括受伤者自己）
                    broadcast('player_hurt', {
                        playerId: hurtPlayerId,
                        damage: damage,
                        currentHp: currentHp,
                        maxHp: maxHp,
                    },hurtPlayerId);
                    break;
                }

                case 'level_up':{
                    const levelUpPlayerId = message.data.playerId;
                    const player = players.get(levelUpPlayerId);
                    if(player){
                        player.level = message.data.level
                    }
                    broadcast('player_level_up', {
                        playerId: levelUpPlayerId,
                        level: message.data.level,
                    }, levelUpPlayerId)
                    break
                }

                case 'player_exp_update':{
                    const updatePlayerId = message.data.playerId
                    const player = players.get(updatePlayerId)
                    if(player){
                        player.exp = message.data.exp
                        player.expToNextLevel = message.data.expToNextLevel
                        player.level = message.data.level
                    }
                    // 广播给所有其他玩家
                    broadcast('player_exp_update',{
                        playerId: updatePlayerId,
                        exp: message.data.exp,
                        expToNextLevel: message.data.expToNextLevel,
                        level: message.data.level,
                    }, updatePlayerId);
                    break
                }

                default:{
                    console.log('未知消息类型：', message.type)
                }
            } 
        } catch (error){
                console.error('解析消息错误：', error)
            }
    })

    // 处理连接关闭
    ws.on('close', () => {
        console.log(`玩家断开连接：${playerId}`)
        players.delete(playerId)
        broadcast('player_left', {id: playerId}, playerId)
    })
})

// 生成敌人（定时调用）
function spawnEnemy(currentTime: number = Date.now()){
    let enemyType: EnemyType = 'normal';

    // 检查是否生成BOSS
    if(currentTime - lastBossTime >= BOSS_INTERVAL){
        enemyType = 'boss';
        lastBossTime = currentTime;
        lastEliteTime = currentTime; // 重置精英倒计时
    }
    // 检查是否生成精英
    else if(currentTime - lastEliteTime >= ELITE_INTERVAL){
        enemyType = 'elite';
        lastEliteTime = currentTime;
    }
    const config = EnemyConfig[enemyType];
    const angle = Math.random() * Math.PI * 2;
    const radius = 400;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;

    const enemyId = `enemy_${nextEnemyId++}`;
    const newEnemy = {
        id: enemyId,
        x: x,
        y: y,
        hp: config.hp,
        maxHp: config.maxHp,
        type: enemyType,
        level: 1,
    };
    enemies.set(enemyId, newEnemy)

    // 广播新敌人给所有玩家
    broadcastAll('enemy_spawn', newEnemy)
}

// 定时生成敌人
let lastSpawnTime = Date.now();
setInterval(() => {
    if(players.size > 0 && enemies.size < 30){
        const now = Date.now();
        spawnEnemy(now);
    }
}, 2000)

// 在玩家移动的处理中，更新敌人位置（向最近玩家移动）
setInterval(() => {
    for(const [id, enemy] of enemies){
        // 寻找最近的玩家
        let nearestPlayer: Player | null = null;
        let minDist = Infinity;
        for(const [pid, player] of players){
            const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
            if(dist < minDist){
                minDist = dist;
                nearestPlayer = player;
            }
        }
        if(nearestPlayer){
            // 向玩家移动
            // const dx = nearestPlayer.x - enemy.x;
            // const dy = nearestPlayer.y - enemy.y;
            // const len = Math.hypot(dx, dy);
            // if(len > 5){
            //     const speed = 100;
            //     const move = Math.min(speed / 60, len);
            //     enemy.x += (dx / len) * move;
            //     enemy.y += (dy / len) * move;
            // }
        }
    }

    // 广播所有敌人位置
    const enemiesData = Array.from(enemies.values()).map(e => ({
        id: e.id,
        x: e.x,
        y: e.y,
        hp: e.hp,
        maxHp: e.maxHp,
    }))
    broadcastAll('enemies_update', {enemies: enemiesData});
}, 1000 / 30); // 30帧更新

