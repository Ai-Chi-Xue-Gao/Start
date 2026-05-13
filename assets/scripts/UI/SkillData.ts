import { _decorator, Component, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('SkillData')
export class SkillData{
    @property
    id: string = '' // 技能唯一标识

    @property
    name: string = '' // 技能显示名称

    @property
    description: string = '' // 技能描述

    @property
    icon: string = '' // 图标名称或路径

    @property
    skillType: string = '' // 类型："weapon"（武器）或 "passive"（被动）

    constructor(id: string, name: string, description: string, skillType: string = 'passive'){
        this.id = id
        this.name = name
        this.description = description
        this.skillType = skillType
    }
}


