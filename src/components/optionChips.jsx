import Btn from './button';

function OptionChips({ options = [], value, multiple = false, onChange, className = 'option-chips slots' }) {
  const isSelected = (optionValue) => {
    return multiple ? value.includes(optionValue) : value === optionValue;
  };
  const handleClick = (optionValue) => {
    if (multiple) {
      value.includes(optionValue) ? onChange(value.filter((item) => item !== optionValue)) : onChange([...value, optionValue]);
    } else {
      onChange(optionValue);
    }
  };
  return (
    <div className={className}>
      {options.map((option) => (
        <Btn
          key={option.value}
          text={option.label}
          className={isSelected(option.value) ? 'btn-green' : ''}
          onClick={() => handleClick(option.value)}
        />
      ))}
    </div>
  );
}

export default OptionChips;
