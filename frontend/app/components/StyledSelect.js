'use client';
import React, { useId } from 'react';
import Select from 'react-select';

export default function StyledSelect({ options, value, onChange, placeholder, disabled, isClearable = true }) {
    const id = useId();
    // Sort options alphabetically by label
    const sortedOptions = [...options].sort((a, b) => {
        const labelA = String(a.label || '').toLowerCase();
        const labelB = String(b.label || '').toLowerCase();
        if (labelA < labelB) return -1;
        if (labelA > labelB) return 1;
        return 0;
    });

    // Match react-select value format (use String comparison to handle int vs string)
    const selectedOption = sortedOptions.find(opt => String(opt.value) === String(value)) || null;

    const customStyles = {
        control: (provided, state) => ({
            ...provided,
            backgroundColor: disabled ? 'rgba(255, 255, 255, 0.1)' : 'var(--color-bg-surface)',
            borderColor: state.isFocused ? 'var(--color-primary)' : 'var(--color-border)',
            borderRadius: '0.75rem',
            padding: '0.25rem',
            boxShadow: state.isFocused ? '0 0 0 3px rgba(79, 70, 229, 0.2)' : '0 2px 8px rgba(0,0,0,0.02)',
            transition: 'all 0.3s ease',
            '&:hover': {
                borderColor: state.isFocused ? 'var(--color-primary)' : 'rgba(79, 70, 229, 0.4)',
                backgroundColor: disabled ? 'rgba(255, 255, 255, 0.1)' : 'var(--color-bg-card)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
            },
            cursor: disabled ? 'not-allowed' : 'pointer'
        }),
        menu: (provided) => ({
            ...provided,
            backgroundColor: 'var(--color-bg-card)',
            backdropFilter: 'blur(16px)',
            borderRadius: '0.75rem',
            boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
            border: '1px solid var(--color-glass-border)',
            overflow: 'hidden',
            zIndex: 9999
        }),
        option: (provided, state) => ({
            ...provided,
            backgroundColor: state.isSelected
                ? 'var(--color-primary)'
                : state.isFocused
                    ? 'rgba(79, 70, 229, 0.15)'
                    : 'transparent',
            color: state.isSelected ? 'white' : 'var(--color-text-main)',
            cursor: 'pointer',
            padding: '0.75rem 1rem',
            transition: 'background-color 0.2s ease',
            '&:active': {
                backgroundColor: 'rgba(79, 70, 229, 0.2)'
            }
        }),
        singleValue: (provided) => ({
            ...provided,
            color: 'var(--color-text-main)',
            fontWeight: '500'
        }),
        placeholder: (provided) => ({
            ...provided,
            color: 'var(--color-text-muted)',
            fontWeight: '400'
        }),
        input: (provided) => ({
            ...provided,
            color: 'var(--color-text-main)'
        }),
        indicatorSeparator: () => ({
            display: 'none'
        })
    };

    return (
        <Select
            options={sortedOptions}
            value={selectedOption}
            onChange={(opt) => onChange(opt ? opt.value : '')}
            placeholder={placeholder || 'Select...'}
            isDisabled={disabled}
            isClearable={isClearable}
            styles={customStyles}
            className="react-select-container"
            classNamePrefix="react-select"
            instanceId={id}
        />
    );
}
