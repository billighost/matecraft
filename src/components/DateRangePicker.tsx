import React, { useId, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';

export interface ArchiveDateRange {
  startDate: string;
  endDate: string;
}

interface DateRangePickerProps {
  value: ArchiveDateRange | null;
  onApply: (range: ArchiveDateRange) => void;
  onCancel: () => void;
}

const monthNames = Array.from({ length: 12 }, (_, month) =>
  new Date(2026, month, 1).toLocaleDateString('en', { month: 'long' })
);
const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function parseDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function formatArchiveDateRange(range: ArchiveDateRange) {
  const format = (value: string) => parseDate(value).toLocaleDateString('en', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
  return `${format(range.startDate)} – ${format(range.endDate)}`;
}

export function DateRangePicker({ value, onApply, onCancel }: DateRangePickerProps) {
  const titleId = useId();
  const today = dateKey(new Date());
  const [startDate, setStartDate] = useState(value?.startDate ?? '');
  const [endDate, setEndDate] = useState(value?.endDate ?? '');
  const [selecting, setSelecting] = useState<'start' | 'end'>(value?.startDate ? 'end' : 'start');
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const [month, setMonth] = useState(() => {
    const initial = value?.startDate ? parseDate(value.startDate) : new Date();
    return new Date(initial.getFullYear(), initial.getMonth() - (value ? 0 : 1), 1);
  });

  const error = startDate && endDate
    ? endDate < startDate ? 'Choose an end date on or after your start date.'
      : endDate > today || startDate > today ? 'Choose dates up to today.' : null
    : null;
  const canApply = Boolean(startDate && endDate && !error);
  const previewEnd = endDate || (hoverDate && hoverDate >= startDate ? hoverDate : '');

  const moveMonth = (offset: number) => {
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  };

  const chooseDate = (selected: string) => {
    if (selecting === 'start' || !startDate || selected < startDate) {
      setStartDate(selected);
      setEndDate('');
      setSelecting('end');
    } else {
      setEndDate(selected);
      setSelecting('start');
    }
    setHoverDate(null);
  };

  const renderMonth = (offset: number) => {
    const calendarMonth = new Date(month.getFullYear(), month.getMonth() + offset, 1);
    const daysInMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate();
    const monthLabel = calendarMonth.toLocaleDateString('en', { month: 'long', year: 'numeric' });
    return (
      <div className={offset ? 'hidden sm:block min-w-0' : 'min-w-0'}>
        <h3 className="text-center text-sm font-semibold mb-3">{monthLabel}</h3>
        <div className="grid grid-cols-7" role="group" aria-label={monthLabel}>
          {weekDays.map((day) => (
            <span key={day} className="text-center text-[10px] font-mono text-zinc-400 pb-2" aria-hidden="true">{day}</span>
          ))}
          {Array.from({ length: calendarMonth.getDay() }, (_, index) => <span key={`blank-${index}`} />)}
          {Array.from({ length: daysInMonth }, (_, index) => {
            const day = index + 1;
            const key = dateKey(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day));
            const isEndpoint = key === startDate || key === endDate;
            const isInRange = Boolean(startDate && previewEnd && key > startDate && key < previewEnd);
            return (
              <button
                key={key}
                type="button"
                disabled={key > today}
                aria-label={new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day).toLocaleDateString('en', { day: 'numeric', month: 'long', year: 'numeric' })}
                aria-pressed={isEndpoint}
                onClick={() => chooseDate(key)}
                onMouseEnter={() => !endDate && selecting === 'end' && setHoverDate(key)}
                onMouseLeave={() => setHoverDate(null)}
                className={`h-9 sm:h-8 text-xs font-mono transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500 disabled:opacity-20 disabled:cursor-default cursor-pointer ${
                  isEndpoint ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 font-semibold rounded-sm'
                    : isInRange ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
                    : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
                }`}
              >{day}</button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div role="group" aria-labelledby={titleId} className="border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-[#111114] p-4 sm:p-5 space-y-4 rounded-sm shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id={titleId} className="flex items-center gap-2 text-sm font-semibold"><CalendarDays className="w-4 h-4" />Custom date range</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Choose a start date, then an end date. Both days are included.</p>
        </div>
        <button type="button" aria-label="Close date range picker" onClick={onCancel} className="p-1 text-zinc-500 hover:text-zinc-950 dark:hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {(['start', 'end'] as const).map((endpoint) => (
          <label key={endpoint} className="min-w-0 text-[10px] uppercase tracking-wider font-mono text-zinc-500 dark:text-zinc-400">
            {endpoint === 'start' ? 'Start date' : 'End date'}
            <input
              type="date"
              max={today}
              value={endpoint === 'start' ? startDate : endDate}
              onFocus={() => setSelecting(endpoint)}
              onChange={(event) => {
                const next = event.target.value;
                if (endpoint === 'start') {
                  setStartDate(next);
                  setSelecting('end');
                } else setEndDate(next);
                if (next) {
                  const selected = parseDate(next);
                  setMonth(new Date(selected.getFullYear(), selected.getMonth(), 1));
                }
              }}
              className={`mt-1.5 w-full min-w-0 h-10 px-2 text-xs normal-case tracking-normal bg-white dark:bg-zinc-950 [color-scheme:light] dark:[color-scheme:dark] border focus:outline-none focus:border-zinc-950 dark:focus:border-zinc-300 ${selecting === endpoint ? 'border-zinc-500 dark:border-zinc-500' : 'border-zinc-200 dark:border-zinc-800'}`}
            />
          </label>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2">
        <button type="button" aria-label="Previous month" onClick={() => moveMonth(-1)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"><ChevronLeft className="w-4 h-4" /></button>
        <div className="flex items-center gap-1">
          <select aria-label="Calendar month" value={month.getMonth()} onChange={(event) => setMonth(new Date(month.getFullYear(), Number(event.target.value), 1))} className="max-w-[140px] bg-transparent px-1 py-1 text-xs cursor-pointer dark:[color-scheme:dark]">
            {monthNames.map((label, index) => <option key={label} value={index} disabled={month.getFullYear() === new Date().getFullYear() && index > new Date().getMonth()}>{label}</option>)}
          </select>
          <select aria-label="Calendar year" value={month.getFullYear()} onChange={(event) => setMonth(new Date(Number(event.target.value), month.getMonth(), 1))} className="bg-transparent px-1 py-1 text-xs cursor-pointer dark:[color-scheme:dark]">
            {Array.from({ length: new Date().getFullYear() - Math.min(2007, month.getFullYear()) + 1 }, (_, index) => new Date().getFullYear() - index).map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
        </div>
        <button type="button" aria-label="Next month" disabled={month >= new Date(new Date().getFullYear(), new Date().getMonth(), 1)} onClick={() => moveMonth(1)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-25 disabled:cursor-default cursor-pointer"><ChevronRight className="w-4 h-4" /></button>
      </div>

      <div className="grid sm:grid-cols-2 gap-5" onMouseLeave={() => setHoverDate(null)}>
        {renderMonth(0)}{renderMonth(1)}
      </div>
      <p aria-live="polite" className={`text-xs ${error ? 'text-red-600 dark:text-red-400' : 'text-zinc-500 dark:text-zinc-400'}`}>
        {error || (canApply ? formatArchiveDateRange({ startDate, endDate }) : selecting === 'start' ? 'Select your start date.' : 'Now select your end date, or move to another month.')}
      </p>
      <div className="flex items-center justify-between gap-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
        <button type="button" onClick={() => { setStartDate(''); setEndDate(''); setSelecting('start'); }} className="text-xs text-zinc-500 hover:text-zinc-950 dark:hover:text-white cursor-pointer">Clear dates</button>
        <button type="button" disabled={!canApply} onClick={() => onApply({ startDate, endDate })} className="px-4 py-2.5 text-xs font-semibold bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 disabled:opacity-30 disabled:cursor-default cursor-pointer">Apply range</button>
      </div>
    </div>
  );
}
