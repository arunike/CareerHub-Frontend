import React, { useState, useEffect, useMemo } from 'react';
import { AutoComplete } from 'antd';
import { loadUsCityOptions } from '../lib/usCityOptions';

type LocationSelectProps = {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  allowClear?: boolean;
  style?: React.CSSProperties;
  id?: string;
};

export const LocationSelect: React.FC<LocationSelectProps> = ({
  value = '',
  onChange,
  placeholder = 'e.g. San Francisco, CA',
  className,
  disabled,
  allowClear = true,
  style,
  id,
}) => {
  const [allUsCityOptions, setAllUsCityOptions] = useState<string[]>([]);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    loadUsCityOptions()
      .then(setAllUsCityOptions)
      .catch((err) => console.error('Failed to load city options:', err));
  }, []);

  const options = useMemo(() => {
    const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9,\s]/g, '');
    const query = normalize(searchText).trim();
    const queryTokens = query.split(/\s+/).filter(Boolean);

    const scored = allUsCityOptions
      .map((raw) => {
        const candidate = normalize(raw);
        let score = 0;

        if (query.length === 0) score += 1;
        if (candidate.startsWith(query) && query.length > 0) score += 10;
        if (candidate.includes(query) && query.length > 0) score += 6;
        if (queryTokens.length && queryTokens.every((token) => candidate.includes(token)))
          score += 4;
        if (candidate === query && query.length > 0) score += 12;

        return { value: raw, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || a.value.localeCompare(b.value))
      .slice(0, 60)
      .map((item) => ({ value: item.value, label: item.value }));

    // If query is not in the list, offer custom query
    if (
      searchText.trim().length > 0 &&
      !scored.some((opt) => opt.value.toLowerCase() === searchText.trim().toLowerCase())
    ) {
      scored.unshift({ value: searchText.trim(), label: searchText.trim() });
    }

    return scored;
  }, [allUsCityOptions, searchText]);

  return (
    <AutoComplete
      id={id}
      value={value}
      options={options}
      onSearch={setSearchText}
      onChange={(val) => {
        onChange?.(val || '');
      }}
      placeholder={placeholder}
      allowClear={allowClear}
      disabled={disabled}
      className={className}
      style={style}
    />
  );
};

export default LocationSelect;
