// Фиксированный список индустрий провайдера: точные значения удобно сравнивать
// и по ним можно отфильтровать провайдеров до отправки в AI
const INDUSTRIES = [
  { value: 'software-development', label: 'Software development' },
  { value: 'construction', label: 'Construction & renovation' },
  { value: 'gardening', label: 'Gardening & landscaping' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'repair', label: 'Repair & maintenance' },
  { value: 'beauty', label: 'Beauty & wellness' },
  { value: 'education', label: 'Education & tutoring' },
  { value: 'design', label: 'Design & creative' },
  { value: 'transport', label: 'Transport & moving' },
  { value: 'other', label: 'Other' },
];

export const industryOptions = INDUSTRIES;

// Человекочитаемое название; у старых провайдеров индустрии нет
export function getIndustryLabel(value) {
  return INDUSTRIES.find((industry) => industry.value === value)?.label ?? 'Not set';
}
