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
  const isCustom = value && !options.includes(value);
  return (
    <div className="flex gap-2 items-center">
      {label && <Label>{label}</Label>}
      <select
        className="px-2 py-1 border rounded bg-ui-bg-field"
        value={isCustom ? OTHER_OPTION : value || ''}
        onChange={e => {
          if (e.target.value === OTHER_OPTION) {
            onChange(''); // Clear value to show input
          } else {
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
      {/* Show custom input if 'Other' is selected */}
      {isCustom || value === '' ? (
        <Input
          placeholder="Eigenes Label..."
          value={isCustom ? value : ''}
          onChange={e => onChange(e.target.value)}
          className="w-32"
        />
      ) : null}
    </div>
  );
};

export default LabelSelect;
