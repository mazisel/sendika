import { DefinitionType } from './types';

interface DefinitionGroupMeta {
  label: string;
  description: string;
  helper?: string;
}

export const definitionTypeOrder: DefinitionType[] = ['workplace', 'position', 'title'];

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
  },
  title: {
    label: 'Unvan',
    description: 'İmza yetkilisi unvan seçenekleri',
    helper: 'Örn. Genel Başkan, Genel Sekreter, Şube Başkanı'
  }
};

export const definitionTypeOptions = definitionTypeOrder.map((type) => ({
  value: type,
  label: definitionGroups[type].label
}));
