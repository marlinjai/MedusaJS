import { Input, Label } from '@medusajs/ui';
import React from 'react';

interface LabelSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  label?: string;
  placeholder?: string;
}

const OTHER_OPTION = 'Andere';

const LabelSelect: React.FC<LabelSelectProps> = ({ value, onChange, options, label, placeholder }) => {
  // Determine if the current value is a custom one
  const isCustom = value && !options.includes(value) && value !== OTHER_OPTION;
  const [showCustomInput, setShowCustomInput] = React.useState(isCustom);
  const [customValue, setCustomValue] = React.useState(isCustom ? value : '');

  return (
    <div className="flex gap-2 items-center">
      {label && <Label>{label}</Label>}
      <select
        className="px-2 py-1 border rounded bg-ui-bg-field"
        value={isCustom ? OTHER_OPTION : value || ''}
        onChange={e => {
          if (e.target.value === OTHER_OPTION) {
            setShowCustomInput(true);
            setCustomValue('');
            onChange(''); // Start with empty custom value
          } else {
            setShowCustomInput(false);
            setCustomValue('');
            onChange(e.target.value);
          }
        }}
      >
        <option value="">{placeholder || 'Label wählen'}</option>
        {options.map(opt => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
        <option value={OTHER_OPTION}>{OTHER_OPTION}</option>
      </select>
      {/* Show custom input if 'Other' is selected or if we have a custom value */}
      {(showCustomInput || isCustom) && (
        <Input
          placeholder="Eigenes Label..."
          value={isCustom ? value : customValue}
          onChange={e => {
            const newValue = e.target.value;
            setCustomValue(newValue);
            onChange(newValue);
          }}
          className="w-32"
        />
      )}
    </div>
  );
};

export default LabelSelect;
