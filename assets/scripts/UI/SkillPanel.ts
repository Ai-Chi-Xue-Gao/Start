import { _decorator, Button, Color, Component, instantiate, Label, Node, Prefab } from 'cc';
import { SkillData } from './SkillData';
import { EventBus } from '../Enemy/EventBus';
import { PlayerController } from '../TypeScript/PlayerController';
import { resources, JsonAsset } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('SkillPanel')
export class SkillPanel extends Component {
    @property(Node)
    contentNode: Node = null // 技能选项列表的容器节点，用于放置所有技能按钮

    @property(Prefab)
    skillItemPrefab: Prefab = null // 技能按钮的预制体，需要提前制作

    @property(Label)
    titleLabel: Label = null // 面板标题文本，显示“升级！选择一个新能力”

    @property(Node)
    panelNode: Node = null // 整个面板的根节点，用于显示、隐藏

    private isOpen: boolean = false // 面板是否打开的标志位
    private onSelectCallback: Function = null // 玩家选择技能后的回调函数
    private skillDatabase: SkillData[] = [] // 存储从配置加载的技能
    private skillsLoaded: boolean = false // 技能是否加载完成
    private pendingOpenCallback: Function = null // 等待打开面板时保存的回调
    private selectedWeaponSkills: string[] = [] // 已选择的武器技能ID列表

    start() {
        // 确保面板初始是隐藏的
        if(this.panelNode){
            this.panelNode.active = false
        }

        // 监听升级事件   -   当玩家升级时，自动弹出技能选择面版
        EventBus.on('player-level-up', this.openPanel, this);

        // 监听游戏暂停事件-升级时暂停游戏（预留）

        // 加载技能配置
        this.loadSkillsFromJson()
    }

    protected onDestroy(): void {
        EventBus.off('player-level-up', this.openPanel, this)
    }

    // 从Json文件加载技能配置
    private loadSkillsFromJson(){
        resources.load('skills', JsonAsset, (err, jsonAsset) => {
            if(err){
                console.error('加载技能配置失败, 使用默认技能', err)
                // 加载失败时使用默认硬编码数据
                this.loadDefaultSkills()
                return
            }

            try{
                const data = jsonAsset.json as {skills: any[]}
                this.skillDatabase = data.skills.map(skill =>
                    new SkillData(skill.id, skill.name, skill.description, skill.skillType)
                )
                console.log('技能配置加载成功, 共', this.skillDatabase.length, '个技能')
            }catch(error){
                console.error('解析技能配置失败，使用默认技能:', error)
                this.loadDefaultSkills()
            }
        })
    }

    // 备用：硬编码默认技能（加载失败时使用）
    private loadDefaultSkills() {
        this.skillDatabase = [
            new SkillData('fireball_double', '双重火球', '每次发射2个火球', 'weapon'),
            new SkillData('fireball_pierce', '火球弹射', '击杀敌人后弹射向附近敌人一次', 'weapon'),
            new SkillData('fireball_speed', '极速火球', '火球飞行速度 +50%', 'weapon'),
            new SkillData('health_up', '生命强化', '最大生命值 +20', 'passive'),
            new SkillData('speed_up', '疾走', '移动速度 +20%', 'passive'),
            new SkillData('exp_up', '经验祝福', '经验获取 +30%', 'passive'),
            new SkillData('cooldown_down', '快速施法', '攻击冷却 -0.2秒', 'passive'),
            new SkillData('magnet_up', '磁力吸引', '经验球吸引范围 +50%', 'passive'),
    ]

    this.skillsLoaded = true
    console.log('使用默认技能, 共', this.skillDatabase.length, '个技能')

    // 如果有等待打开的面板，现在打开
    if(this.pendingOpenCallback !== undefined){
        this.openPanel(this.pendingOpenCallback)
        this.pendingOpenCallback = undefined
    }
}


    /**
     * 打开技能选择面板
     * 根据当前可用技能池，随机选出3个技能显示
     * @param onSelect 选择技能后的回调函数
     */

    public openPanel(onSelect?: Function){
        // 如果技能数据库为空，无法打开
        if(this.skillDatabase.length === 0){
            console.warn('技能数据库为空，无法打开面板')
            return
        }
        // 如果面板已经打开，不重复打开
        if(this.isOpen) return

        // 保存回调函数
        this.onSelectCallback = onSelect

        // 显示面板
        if(this.panelNode){
            this.panelNode.active = true
        }

        // 设置标题
        if(this.titleLabel){
            this.titleLabel.string = "⭐升级!选择新的力量⭐"
        }

        // 清空之前的技能选项
        this.clearSkillItems()

        // 随机抽取3个不重复的技能
        const selectedSkills = this.getRandomSkills(3)

        // 为每个技能创建按钮
        for(const skill of selectedSkills){
            this.createSkillItem(skill)
        }

        // 标记面板已打开
        this.isOpen = true

        // 暂停游戏
        this.pauseGame(true)
    }

    /**
     * 关闭技能选择面板
     */
    public closePanel(){
        if(!this.isOpen) return

        // 隐藏面板
        if(this.panelNode){
            this.panelNode.active = false
        }

        // 标记面板已关闭
        this.isOpen = false

        // 恢复游戏
        this.pauseGame(false)
    }

    /**
     * 暂停/恢复游戏
     * @param pause true=暂停, false=恢复
     */
    private pauseGame(pause: boolean){
        EventBus.emit('game-pause', pause)
    }

    /**
     * 清空容器中的所有技能选项
     */
    private clearSkillItems(){
        if(!this.contentNode) return

        // 遍历删除所有子节点
        const children = [...this.contentNode.children]
        for(const child of children){
            child.destroy()
        }
    }

    /**
     * 创建一个技能选项按钮
     * @param skill 技能数据
     */
    private createSkillItem(skill: SkillData){
        if(!this.skillItemPrefab || !this.contentNode) return

        // 实例化预制体
        const item = instantiate(this.skillItemPrefab)

        // 添加到容器中
        this.contentNode.addChild(item)

        // 设置技能名称标签
        const nameLabel = item.getChildByName('NameLabel')?.getComponent(Label)
        if(nameLabel){
            nameLabel.string = skill.name
            // 根据类型设置不同颜色
            if(skill.skillType === 'weapon'){
                nameLabel.color = new Color(255, 200, 100, 255) // 橙色
            }else{
                nameLabel.color = new Color(100, 200, 255, 255) // 蓝色
            }
        }

        // 设置技能描述标签
        const descLabel = item.getChildByName('DescLabel')?.getComponent(Label)
        if(descLabel){
            descLabel.string = skill.description
        }

        // 设置类型标签
        const typeLabel = item.getChildByName('TypeLabel')?.getComponent(Label)
        if(typeLabel){
            typeLabel.string = skill.skillType === 'weapon' ? '武器' : '被动'
        }

        // 绑定按钮点击事件
        const button = item.getComponentInChildren(Button);
        if(button){
            // 使用闭包捕获当前的skill变量
            button.node.on(Button.EventType.CLICK, () => {
                this.onSkillSelected(skill)
            }, this)
        }
    }

    /**
     * 当玩家选择了某个技能时调用
     * @param skill 被选中的技能
     */
    private onSkillSelected(skill: SkillData){
        // 应用技能效果
        this.applySkillEffect(skill)

        // 如果有回调函数，调用它
        if(this.onSelectCallback){
            this.onSelectCallback(skill)
        }

        // 触发技能选择事件
        EventBus.emit('skill-selected', skill)

        // 关闭面板
        this.closePanel()
    }

    /**
     * 应用技能效果到玩家身上
     * @param skill 被选中的技能
     */
    private applySkillEffect(skill: SkillData){
        // 获取玩家控制器
        const canvas = this.node.scene.getChildByName('Canvas')
        const playerNode = canvas?.getChildByName('Player')

        if(!playerNode) return

        const playerController = playerNode.getComponent(PlayerController)
        if(!playerController) return

        // 根据技能ID应用不同效果
        switch(skill.id){
            case 'health_up':{
                // 增加最大生命值
                const oldMax = playerController.getMaxHealth()
                const newMaxHealth = oldMax + 20
                // 需要通过方法修改
                playerController.setMaxHealth(newMaxHealth)
                console.log('[技能]最大生命值+20')
                break
            }   

            case 'speed_up':{
                // 增加移动速度
                const oldSpeed = playerController.getSpeed()
                const newSpeed = oldSpeed * 1.2
                playerController.setSpeed(newSpeed)
                console.log('[技能]移动速度+20%')
                break
            }

            case 'exp_up':{
                const oldMultiplier = playerController.getExpMultiplier()
                const newMultiplier = oldMultiplier + 0.3
                playerController.setExpMultiplier(newMultiplier)
                console.log('[技能]经验获取+30%')
                break
            }

            case 'fireball_double':{
                playerController.setDoubleFireball(true)
                this.selectedWeaponSkills.push('fireball_double')
                console.log('[技能]双重火球已激活')
                break
            }

            case 'fireball_pierce':{
                playerController.setPierceFireball(true)
                this.selectedWeaponSkills.push('fireball_pierce')
                console.log('[技能]火球穿透已激活')
                break
            }

            case 'fireball_speed':{
                playerController.setFireballSpeedMultiplier(1.5)
                this.selectedWeaponSkills.push('fireball_speed')
                console.log('[技能]火球速度+50%')
                break
            }

            case 'cooldown_down':{
                const newCd = playerController.getAttackCooldownReduction() + 0.2
                playerController.setAttackCooldownReduction(newCd)
                console.log('[技能]攻击冷却-0.2秒')
                break
            }

            case 'magnet_up':{
                const newMagnet = playerController.getMagnetRangeMultiplier() + 0.5
                playerController.setMagnetRangeMultiplier(newMagnet)
                console.log('[技能]经验球吸引范围+50%')
                break
            }

            default:{
                console.log(`[技能]获得技能：${skill.name}`)
                break
            }  
        }
    }

    /**
     * 从技能池中随机抽取不重复的技能
     * @param count 需要抽取的数量
     * @returns 技能数组
     */
    private getRandomSkills(count: number): SkillData[]{
        // 过滤掉已选择的武器技能
        const availableSkills = this.skillDatabase.filter(skill => {
            // 如果是武器技能且已被选中，则排除
            if(skill.skillType === 'weapon' && this.selectedWeaponSkills.indexOf(skill.id) !== -1){
                return false
            }
            return true
        })

        // 如果可用技能不足，直接返回全部
        if(availableSkills.length === 0){
            console.warn('没有可用技能了')
            return []
        }

        // 复制一份技能池
        const pool = [...availableSkills]
        const result: SkillData[] = []

        // 如果请求数量超过总数量，全部返回
        const realCount = Math.min(count, pool.length)

        for(let i = 0; i < realCount; i++){
            // 随机选择一个索引
            const randomIndex = Math.floor(Math.random() * pool.length)
            // 取出该技能
            const selected = pool[randomIndex]
            // 从池中移除，避免重复选择
            pool.splice(randomIndex, 1)
            // 添加到结果中
            result.push(selected)
        }

        return result
    }

    update(deltaTime: number) {
        
    }
}


