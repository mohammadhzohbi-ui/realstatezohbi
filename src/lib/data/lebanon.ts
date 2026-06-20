export interface GovernorateData {
  name: string;
  districts: string[];
}

export const LEBANON_DATA: GovernorateData[] = [
  {
    name: 'بيروت',
    districts: ['بيروت'],
  },
  {
    name: 'جبل لبنان',
    districts: ['بعبدا', 'عاليه', 'الشوف', 'كسروان', 'جبيل', 'المتن'],
  },
  {
    name: 'الشمال',
    districts: ['طرابلس', 'المنية-الضنية', 'زغرتا', 'البترون', 'بشري', 'الكورة'],
  },
  {
    name: 'عكار',
    districts: ['عكار'],
  },
  {
    name: 'بعلبك-الهرمل',
    districts: ['بعلبك', 'الهرمل'],
  },
  {
    name: 'البقاع',
    districts: ['زحلة', 'راشيا', 'غرب البقاع'],
  },
  {
    name: 'النبطية',
    districts: ['النبطية', 'بنت جبيل', 'مرجعيون', 'حاصبيا'],
  },
  {
    name: 'الجنوب',
    districts: ['صيدا', 'صور', 'جزين'],
  },
];

export function getDistricts(governorate: string): string[] {
  return LEBANON_DATA.find(g => g.name === governorate)?.districts ?? [];
}
