import { DefinitionType } from './types';

interface DefinitionGroupMeta {
  label: string;
  description: string;
  helper?: string;
}

export const definitionTypeOrder: DefinitionType[] = ['workplace', 'position'];

export const definitionGroups: Record<DefinitionType, DefinitionGroupMeta> = {
  workplace: {
    label: 'İşyeri',
    description: 'Üyelerin çalıştığı kurum/işyeri seçenekleri',
    helper: 'Örn. Devlet Hastanesi, Özel Hastane, Aile Sağlığı Merkezi'
  },
  position: {
    label: 'Pozisyon',
    description: 'Üyelerin görev/pozisyon seçenekleri',
    helper: 'Örn. Hemşire, Ebe, Sağlık Memuru'
  }
};

export const definitionTypeOptions = definitionTypeOrder.map((type) => ({
  value: type,
  label: definitionGroups[type].label
}));
