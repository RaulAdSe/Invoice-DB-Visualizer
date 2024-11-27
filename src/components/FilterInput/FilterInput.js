// FilterInput.js - New reusable component for filter inputs
import React, { useState, useCallback, useEffect } from 'react';
import { TextField } from '@mui/material';
import { debounce } from 'lodash';

const FilterInput = ({ 
  name, 
  label, 
  type = 'text', 
  value: initialValue = '', 
  onChange,
  InputLabelProps = {} 
}) => {
  // Maintain internal state for the input value
  const [inputValue, setInputValue] = useState(initialValue);

  // Create a heavily debounced callback for parent updates
  const debouncedCallback = useCallback(
    debounce((value) => {
      onChange({ target: { name, value } });
    }, 1500), // 1.5 second debounce
    [name, onChange]
  );

  // Update internal state immediately but debounce parent updates
  const handleChange = (event) => {
    const newValue = event.target.value;
    setInputValue(newValue);
    debouncedCallback(newValue);
  };

  // Update internal state if parent value changes
  useEffect(() => {
    setInputValue(initialValue);
  }, [initialValue]);

  return (
    <TextField
      name={name}
      label={label}
      type={type}
      value={inputValue}
      onChange={handleChange}
      variant="outlined"
      size="small"
      InputLabelProps={InputLabelProps}
      // Prevent focus loss and improve stability
      onBlur={(e) => e.target.focus()}
      autoComplete="off"
      sx={{
        '& .MuiInputBase-input': {
          cursor: 'text', // Always show text cursor
        },
        '& .MuiInputBase-root': {
          '&.Mui-focused': {
            boxShadow: '0 0 0 2px rgba(0,0,0,0.1)', // Subtle focus indicator
          }
        }
      }}
    />
  );
};

export default FilterInput;