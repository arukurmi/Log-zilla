'use client';

import React, { useState, useEffect, useRef } from 'react';
import QueryBar from './QueryBar';
import ZillaMark from './ZillaMark';
import { useTheme } from './ThemeProvider';
import { StreamEvent } from '@/core/eventBuffer';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { DatePicker, ConfigProvider, theme, Modal } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { FilterIcon, Copy, Check, Sun, Moon, Trash2 } from 'lucide-react';

// Per-theme colors for the pieces that can't read CSS variables
// (Ant Design tokens and recharts props need literal values)
const PALETTE = {
  dark: {
    accent: '#8b5cf6',
    accentSoft: 'rgba(139, 92, 246, 0.35)',
    key: '#38bdf8',
    value: '#c4b5fd',
    surface: '#151827',
    border: '#262b40',
    text: '#e7e9f4',
    axis: '#8a91ab',
    grid: '#262b40',
  },
  light: {
    accent: '#6d28d9',
    accentSoft: 'rgba(109, 40, 217, 0.25)',
    key: '#0284c7',
    value: '#6d28d9',
    surface: '#ffffff',
    border: '#d9dcea',
    text: '#1b1f2e',
    axis: '#5a6072',
    grid: '#d9dcea',
  },
};

// Severity badge styling per level
const severityBadge = (level?: string) => {
  switch ((level || '').toLowerCase()) {
    case 'error':
      return 'bg-red-500/15 text-red-500';
    case 'warn':
    case 'warning':
      return 'bg-amber-500/15 text-amber-500';
    case 'info':
      return 'bg-sky-500/15 text-sky-500';
    case 'debug':
      return 'bg-violet-500/15 text-violet-400';
    default:
      return 'bg-gray-500/15 text-gray-400';
  }
};

// Small on/off pill used for the view toggles
const TogglePill = ({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`rounded-full px-2.5 py-0.5 text-xs transition-colors hover:cursor-pointer ${
      active
        ? 'bg-[var(--zl-accent)] text-white'
        : 'border border-[var(--zl-border)] bg-[var(--zl-surface)] text-[var(--zl-muted)] hover:text-[var(--zl-text)]'
    }`}
  >
    {label}
  </button>
);

const StreamConsole: React.FC = () => {
  const { mode, toggle } = useTheme();
  const colors = PALETTE[mode];

  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [visibleEvents, setVisibleEvents] = useState<StreamEvent[]>([]);
  const [vaultSize, setVaultSize] = useState<number>(0);
  const [isPurgeModalVisible, setIsPurgeModalVisible] =
    useState<boolean>(false);
  const [purgeService, setPurgeService] = useState<string>('');
  const [purgeTimeframe, setPurgeTimeframe] = useState<string>('7d');

  const [isConnected, setIsConnected] = useState(true);
  const [autoScroll, setAutoScroll] = useState(false);
  const [levels, setLevels] = useState<string[]>([]);
  const [services, setServices] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    search: '',
    level: '',
    service: '',
    dateRange: '15m',
    startDate: undefined as string | undefined,
    endDate: undefined as string | undefined,
  });

  const [dateRange, setDateRange] = useState('15m');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showCustomDate, setShowCustomDate] = useState(false);
  const flattenObject = (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    obj: any,
    parentKey = '',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    res: { [key: string]: any } = {},
  ) => {
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const propName = parentKey ? `${parentKey}.${key}` : key;
        if (
          typeof obj[key] === 'object' &&
          obj[key] !== null &&
          !Array.isArray(obj[key])
        ) {
          flattenObject(obj[key], propName, res);
        } else {
          res[propName] = obj[key];
        }
      }
    }
    return res;
  };

  const [isFormatted, setIsFormatted] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const dateRangePresets = [
    { value: '15m', label: 'Last 15 minutes' },
    { value: '30m', label: 'Last 30 minutes' },
    { value: '1h', label: 'Last 1 hour' },
    { value: '4h', label: 'Last 4 hours' },
    { value: '24h', label: 'Last 24 hours' },
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: 'custom', label: 'Custom range' },
  ];

  const getDateRangeValues = () => {
    if (dateRange === 'custom') {
      if (!customStartDate || !customEndDate) {
        const now = dayjs();
        const startDate = now.subtract(15, 'minute');
        return {
          startDate: startDate.toISOString(),
          endDate: now.toISOString(),
        };
      }

      const start = dayjs(customStartDate);
      const end = dayjs(customEndDate);

      if (
        !start.isValid() ||
        !end.isValid() ||
        start.isAfter(end) ||
        start.isSame(end)
      ) {
        const now = dayjs();
        const startDate = now.subtract(15, 'minute');
        return {
          startDate: startDate.toISOString(),
          endDate: now.toISOString(),
        };
      }

      return {
        startDate: customStartDate,
        endDate: customEndDate,
      };
    }

    const now = dayjs();
    let startDate = now;

    switch (dateRange) {
      case '15m':
        startDate = now.subtract(15, 'minute');
        break;
      case '30m':
        startDate = now.subtract(30, 'minute');
        break;
      case '1h':
        startDate = now.subtract(1, 'hour');
        break;
      case '4h':
        startDate = now.subtract(4, 'hour');
        break;
      case '24h':
        startDate = now.subtract(1, 'day');
        break;
      case '7d':
        startDate = now.subtract(7, 'day');
        break;
      case '30d':
        startDate = now.subtract(30, 'day');
        break;
      default:
        startDate = now.subtract(15, 'minute');
    }

    return {
      startDate: startDate.toISOString(),
      endDate: now.toISOString(),
    };
  };
  const [isPolling, setIsPolling] = useState(true);
  const [showGraph, setShowGraph] = useState(true);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([
    'timestamp',
    'service',
    'level',
    'message',
  ]);
  const availableColumns = [
    { key: 'timestamp', label: 'when' },
    { key: 'service', label: 'source' },
    { key: 'level', label: 'severity' },
    { key: 'message', label: 'event' },
  ];
  const [selectedEvent, setSelectedEvent] = useState<StreamEvent | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const streamEndRef = useRef<HTMLDivElement>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchEvents = async (searchFilters?: {
    search?: string;
    level?: string;
    service?: string;
    dateRange?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    try {
      const params = new URLSearchParams();
      if (searchFilters?.search) params.append('query', searchFilters.search);
      if (searchFilters?.level) params.append('level', searchFilters.level);
      if (searchFilters?.service)
        params.append('service', searchFilters.service);
      if (searchFilters?.startDate)
        params.append('startDate', searchFilters.startDate);
      if (searchFilters?.endDate)
        params.append('endDate', searchFilters.endDate);

      const url = `/api/otel${
        params.toString() ? '?' + params.toString() : ''
      }`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch logs');
      }

      const data = await response.json();
      if (data.success && data.logs) {
        const sortedEvents = [...data.logs].sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
        );
        setEvents(sortedEvents);
        setVisibleEvents(sortedEvents);

        if (data.levels) setLevels(data.levels);
        if (data.services) setServices(data.services);

        setIsConnected(true);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
      setIsConnected(false);
    }
  };

  const fetchVaultSize = async () => {
    try {
      const response = await fetch('/api/db-size');
      const data = await response.json();
      if (data.success) {
        setVaultSize(data.size);
      }
    } catch (error) {
      console.error('Error fetching db size:', error);
    }
  };

  useEffect(() => {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setMinutes(now.getMinutes() - 15);

    const initialFilters = {
      search: '',
      level: '',
      service: '',
      dateRange: '15m',
      startDate: startDate.toISOString(),
      endDate: now.toISOString(),
    };
    fetchEvents(initialFilters);
    fetchVaultSize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    if (isPolling) {
      pollingIntervalRef.current = setInterval(() => {
        const currentDateValues = getDateRangeValues();
        const currentFilters = {
          ...filters,
          ...currentDateValues,
        };
        fetchEvents(currentFilters);
      }, 3000);
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [isPolling, filters, getDateRangeValues]);

  useEffect(() => {
    if (autoScroll && streamEndRef.current) {
      streamEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [visibleEvents, autoScroll]);

  const openEventDrawer = (event: StreamEvent) => {
    setSelectedEvent(event);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setSelectedEvent(null);
    setDrawerOpen(false);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const addFilterFromDrawer = (key: string, value: any) => {
    let formattedValue = value;
    if (typeof value === 'string') {
      formattedValue = `"${value}"`;
    } else if (value === null) {
      formattedValue = 'null';
    } else if (typeof value === 'object') {
      formattedValue = `"${JSON.stringify(value)}"`;
    }

    const searchTerm = `${key}:${formattedValue}`;

    const newSearch = filters.search
      ? `${filters.search} ${searchTerm}`
      : searchTerm;

    const newFilters = {
      ...filters,
      search: newSearch,
    };

    handleFilterChange(newFilters);

    closeDrawer();
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const copyToClipboard = (key: string, value: any) => {
    const textToCopy =
      typeof value === 'object' && value !== null
        ? JSON.stringify(value, null, 2)
        : String(value);
    navigator.clipboard.writeText(textToCopy);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleFilterChange = (newFilters: {
    search: string;
    level: string;
    service: string;
  }) => {
    const dateValues = getDateRangeValues();

    const combinedFilters = {
      ...newFilters,
      dateRange,
      ...dateValues,
    };

    setFilters({
      search: combinedFilters.search,
      level: combinedFilters.level,
      service: combinedFilters.service,
      dateRange: combinedFilters.dateRange,
      startDate: combinedFilters.startDate,
      endDate: combinedFilters.endDate,
    });

    fetchEvents(combinedFilters);
  };

  const handleDateRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDateRange = e.target.value;
    setDateRange(newDateRange);
    setShowCustomDate(newDateRange === 'custom');

    if (newDateRange === 'custom' && (!customStartDate || !customEndDate)) {
      const now = dayjs();
      const oneHourAgo = now.subtract(1, 'hour');

      setCustomStartDate(oneHourAgo.toISOString());
      setCustomEndDate(now.toISOString());

      return;
    }

    if (newDateRange !== 'custom') {
      const now = new Date();
      const startDate = new Date();

      switch (newDateRange) {
        case '15m':
          startDate.setMinutes(now.getMinutes() - 15);
          break;
        case '30m':
          startDate.setMinutes(now.getMinutes() - 30);
          break;
        case '1h':
          startDate.setHours(now.getHours() - 1);
          break;
        case '4h':
          startDate.setHours(now.getHours() - 4);
          break;
        case '24h':
          startDate.setDate(now.getDate() - 1);
          break;
        case '7d':
          startDate.setDate(now.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(now.getDate() - 30);
          break;
        default:
          startDate.setMinutes(now.getMinutes() - 15);
      }

      const dateValues = {
        startDate: startDate.toISOString(),
        endDate: now.toISOString(),
      };

      const combinedFilters = {
        search: filters.search,
        level: filters.level,
        service: filters.service,
        dateRange: newDateRange,
        ...dateValues,
      };

      setFilters({
        search: combinedFilters.search,
        level: combinedFilters.level,
        service: combinedFilters.service,
        dateRange: combinedFilters.dateRange,
        startDate: combinedFilters.startDate,
        endDate: combinedFilters.endDate,
      });

      fetchEvents(combinedFilters);
    }
  };

  const handleCustomDateChange = () => {
    if (dateRange === 'custom' && customStartDate && customEndDate) {
      const start = dayjs(customStartDate);
      const end = dayjs(customEndDate);

      if (start.isValid() && end.isValid() && start.isBefore(end)) {
        const combinedFilters = {
          search: filters.search,
          level: filters.level,
          service: filters.service,
          dateRange,
          startDate: customStartDate,
          endDate: customEndDate,
        };

        setFilters({
          search: combinedFilters.search,
          level: combinedFilters.level,
          service: combinedFilters.service,
          dateRange: combinedFilters.dateRange,
          startDate: combinedFilters.startDate,
          endDate: combinedFilters.endDate,
        });

        fetchEvents(combinedFilters);
      }
    }
  };

  const showPurgeModal = () => {
    setIsPurgeModalVisible(true);
  };

  const handlePurgeCancel = () => {
    setIsPurgeModalVisible(false);
  };

  const handlePurgeOk = async () => {
    try {
      const params = new URLSearchParams();
      if (purgeService) {
        params.append('service', purgeService);
      }

      if (purgeTimeframe !== 'all') {
        const now = dayjs();
        let endDate;
        if (purgeTimeframe === '7d') {
          endDate = now.subtract(7, 'day');
        } else if (purgeTimeframe === '14d') {
          endDate = now.subtract(14, 'day');
        } else if (purgeTimeframe === '30d') {
          endDate = now.subtract(30, 'day');
        }
        if (endDate) {
          params.append('endDate', endDate.toISOString());
        }
      }

      await fetch(`/api/otel?${params.toString()}`, { method: 'DELETE' });

      // Refetch events and vault size
      const dateValues = getDateRangeValues();
      const combinedFilters = {
        ...filters,
        dateRange,
        ...dateValues,
      };
      fetchEvents(combinedFilters);
      fetchVaultSize();
    } catch (error) {
      console.error('Error clearing logs:', error);
    } finally {
      setIsPurgeModalVisible(false);
    }
  };

  const antdTheme = {
    algorithm: mode === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: {
      colorPrimary: colors.accent,
      colorBgBase: colors.surface,
      colorTextBase: colors.text,
      colorBorder: colors.border,
    },
  };

  return (
    <div className="flex h-screen flex-col bg-[var(--zl-bg)] font-sans text-[var(--zl-text)]">
      {/* ---- Top bar: identity left, housekeeping right ---- */}
      <header className="flex items-center justify-between border-b border-[var(--zl-border)] bg-[var(--zl-surface)] px-3 py-2">
        <div className="flex items-center gap-2">
          <ZillaMark size={26} />
          <h1 className="text-lg font-bold tracking-widest text-[var(--zl-accent)]">
            LOG-ZILLA
          </h1>
          <span className="mt-0.5 hidden text-xs text-[var(--zl-muted)] sm:inline">
            every process, one stream
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full border border-[var(--zl-border)] px-2.5 py-0.5 text-xs text-[var(--zl-muted)]">
            vault{' '}
            {vaultSize ? (vaultSize / 1024 / 1024).toFixed(2) + ' MB' : '—'}
          </span>

          {/* sun / moon segmented theme switch */}
          <div className="flex items-center overflow-hidden rounded-full border border-[var(--zl-border)]">
            <button
              onClick={() => mode !== 'light' && toggle()}
              className={`px-2 py-1 transition-colors hover:cursor-pointer ${
                mode === 'light'
                  ? 'bg-[var(--zl-accent)] text-white'
                  : 'text-[var(--zl-muted)]'
              }`}
              title="Light theme"
            >
              <Sun size={13} />
            </button>
            <button
              onClick={() => mode !== 'dark' && toggle()}
              className={`px-2 py-1 transition-colors hover:cursor-pointer ${
                mode === 'dark'
                  ? 'bg-[var(--zl-accent)] text-white'
                  : 'text-[var(--zl-muted)]'
              }`}
              title="Dark theme"
            >
              <Moon size={13} />
            </button>
          </div>

          <button
            onClick={showPurgeModal}
            className="flex items-center gap-1 rounded-full border border-[var(--zl-danger)] px-2.5 py-1 text-xs text-[var(--zl-danger)] transition-colors hover:cursor-pointer hover:bg-[var(--zl-danger)] hover:text-white"
            title="Delete stored logs by source and age"
          >
            <Trash2 size={12} />
            Purge
          </button>
        </div>
      </header>

      {/* ---- Activity strip: status + time window + pulse graph ---- */}
      <section className="border-b border-[var(--zl-border)] bg-[var(--zl-bg)]">
        <div className="flex items-center justify-between px-3 pt-2">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              {isConnected && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--zl-ok)] opacity-60"></span>
              )}
              <span
                className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
                  isConnected ? 'bg-[var(--zl-ok)]' : 'bg-[var(--zl-danger)]'
                }`}
                title={isConnected ? 'Receiving data' : 'Server unreachable'}
              ></span>
            </span>
            <span className="text-xs font-semibold tracking-wider text-[var(--zl-muted)] uppercase">
              Activity
            </span>
          </div>
          <div className="flex items-center gap-2">
            <select
              className="min-w-[140px] rounded-full border border-[var(--zl-border)] bg-[var(--zl-surface)] px-3 py-1 text-xs text-[var(--zl-text)] focus:ring-1 focus:ring-[var(--zl-accent)] focus:outline-none"
              value={dateRange}
              onChange={handleDateRangeChange}
            >
              {dateRangePresets.map((preset) => (
                <option key={preset.value} value={preset.value}>
                  {preset.label}
                </option>
              ))}
            </select>

            {showCustomDate && (
              <ConfigProvider theme={antdTheme}>
                <DatePicker
                  showTime={{ format: 'HH:mm' }}
                  format="MMM D, YYYY HH:mm"
                  value={customStartDate ? dayjs(customStartDate) : null}
                  onChange={(date: Dayjs | null) => {
                    if (date) {
                      setCustomStartDate(date.toISOString());
                      if (
                        customEndDate &&
                        dayjs(customEndDate).isValid() &&
                        date.isBefore(dayjs(customEndDate))
                      ) {
                        setTimeout(handleCustomDateChange, 100);
                      }
                    }
                  }}
                  placeholder="From date"
                  size="small"
                  style={{ width: 160 }}
                  disabledDate={(current) =>
                    customEndDate
                      ? current && current.isAfter(dayjs(customEndDate))
                      : false
                  }
                />
                <DatePicker
                  showTime={{ format: 'HH:mm' }}
                  format="MMM D, YYYY HH:mm"
                  value={customEndDate ? dayjs(customEndDate) : null}
                  onChange={(date: Dayjs | null) => {
                    if (date) {
                      setCustomEndDate(date.toISOString());
                      if (
                        customStartDate &&
                        dayjs(customStartDate).isValid() &&
                        date.isAfter(dayjs(customStartDate))
                      ) {
                        setTimeout(handleCustomDateChange, 100);
                      }
                    }
                  }}
                  placeholder="To date"
                  size="small"
                  style={{ width: 160 }}
                  disabledDate={(current) =>
                    customStartDate
                      ? current && current.isBefore(dayjs(customStartDate))
                      : false
                  }
                />
              </ConfigProvider>
            )}
          </div>
        </div>

        {showGraph && (
          <div className="h-40 overflow-hidden px-1 pb-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={(() => {
                  const eventsToGraph =
                    visibleEvents.length > 0 ? visibleEvents : [];
                  if (eventsToGraph.length === 0) return [];

                  const timeIntervals: { [key: string]: number } = {};
                  let intervalMs = 60000;
                  switch (dateRange) {
                    case '15m':
                    case '30m':
                      intervalMs = 60000;
                      break;
                    case '1h':
                      intervalMs = 300000;
                      break;
                    case '4h':
                      intervalMs = 900000;
                      break;
                    case '24h':
                      intervalMs = 3600000;
                      break;
                    case '7d':
                      intervalMs = 21600000;
                      break;
                    case '30d':
                      intervalMs = 86400000;
                      break;
                    default:
                      intervalMs = 60000;
                  }

                  const dateValues = getDateRangeValues();
                  if (!dateValues.startDate || !dateValues.endDate) return [];

                  const startTime = new Date(dateValues.startDate).getTime();
                  const endTime = new Date(dateValues.endDate).getTime();
                  if (
                    isNaN(startTime) ||
                    isNaN(endTime) ||
                    startTime >= endTime
                  )
                    return [];

                  for (
                    let time = startTime;
                    time <= endTime;
                    time += intervalMs
                  ) {
                    if (!isNaN(time)) {
                      timeIntervals[new Date(time).toISOString()] = 0;
                    }
                  }

                  eventsToGraph.forEach((event) => {
                    const eventTime = new Date(event.timestamp).getTime();
                    if (!isNaN(eventTime)) {
                      const bucketTime =
                        Math.floor((eventTime - startTime) / intervalMs) *
                          intervalMs +
                        startTime;
                      if (!isNaN(bucketTime)) {
                        const timeKey = new Date(bucketTime).toISOString();
                        if (timeIntervals[timeKey] !== undefined) {
                          timeIntervals[timeKey]++;
                        }
                      }
                    }
                  });

                  return Object.keys(timeIntervals)
                    .sort(
                      (a, b) => new Date(a).getTime() - new Date(b).getTime(),
                    )
                    .map((time) => {
                      const date = new Date(time);
                      let formattedTime;
                      if (intervalMs >= 86400000) {
                        formattedTime = date.toLocaleDateString();
                      } else if (intervalMs >= 3600000) {
                        formattedTime = date.toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        });
                      } else {
                        formattedTime = date.toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        });
                      }
                      return {
                        time: formattedTime,
                        count: timeIntervals[time],
                        fullTime: time,
                      };
                    });
                })()}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="pulseFill" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor={colors.accent}
                      stopOpacity={0.45}
                    />
                    <stop
                      offset="100%"
                      stopColor={colors.key}
                      stopOpacity={0.02}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="2 6"
                  stroke={colors.grid}
                  vertical={false}
                />
                <XAxis
                  dataKey="time"
                  stroke={colors.axis}
                  tick={{ fill: colors.axis, fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  stroke={colors.axis}
                  tick={{ fill: colors.axis, fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={32}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: colors.surface,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
                  }}
                  labelStyle={{ color: colors.text, fontWeight: 'bold' }}
                  itemStyle={{ color: colors.accent }}
                />
                <Area
                  type="step"
                  dataKey="count"
                  stroke={colors.accent}
                  strokeWidth={2}
                  fill="url(#pulseFill)"
                  activeDot={{ r: 4, fill: colors.key, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* ---- Query bar with filters and view toggles ---- */}
      <QueryBar
        onFilterChange={handleFilterChange}
        levels={levels}
        services={services}
        search={filters.search}
        extras={
          <>
            <div className="h-4 w-px bg-[var(--zl-border)]"></div>
            <span className="text-xs text-[var(--zl-muted)]">Columns:</span>
            {availableColumns.map((column) => (
              <TogglePill
                key={column.key}
                active={selectedColumns.includes(column.key)}
                label={column.label}
                onClick={() => {
                  setSelectedColumns((prev) =>
                    prev.includes(column.key)
                      ? prev.filter((c) => c !== column.key)
                      : [...prev, column.key],
                  );
                }}
              />
            ))}
            <div className="h-4 w-px bg-[var(--zl-border)]"></div>
            <span className="text-xs text-[var(--zl-muted)]">View:</span>
            <TogglePill
              active={isPolling}
              label="live"
              onClick={() => setIsPolling(!isPolling)}
            />
            <TogglePill
              active={autoScroll}
              label="follow"
              onClick={() => setAutoScroll(!autoScroll)}
            />
            <TogglePill
              active={showGraph}
              label="pulse"
              onClick={() => setShowGraph(!showGraph)}
            />
          </>
        }
      />

      {/* ---- Event stream ---- */}
      <div className="flex-grow overflow-auto">
        {visibleEvents.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-[var(--zl-muted)]">
            <div className="opacity-40">
              <ZillaMark size={56} />
            </div>
            <p className="text-sm">
              Nothing in this time window. Pipe a process into logzilla to
              wake the beast.
            </p>
          </div>
        ) : (
          <table className="w-full font-mono text-xs">
            <thead className="sticky top-0 bg-[var(--zl-surface)]">
              <tr>
                {selectedColumns.includes('timestamp') && (
                  <th className="p-2 text-left text-[11px] font-semibold tracking-wider text-[var(--zl-muted)] uppercase">
                    When
                  </th>
                )}
                {selectedColumns.includes('service') && (
                  <th className="p-2 text-left text-[11px] font-semibold tracking-wider text-[var(--zl-muted)] uppercase">
                    Source
                  </th>
                )}
                {selectedColumns.includes('level') && (
                  <th className="p-2 text-left text-[11px] font-semibold tracking-wider text-[var(--zl-muted)] uppercase">
                    Severity
                  </th>
                )}
                {selectedColumns.includes('message') && (
                  <th className="p-2 text-left text-[11px] font-semibold tracking-wider text-[var(--zl-muted)] uppercase">
                    Event
                  </th>
                )}
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {visibleEvents.map((event) => {
                const formatTimestamp = (timestamp: string) => {
                  try {
                    const date = new Date(timestamp);
                    return (
                      date.toLocaleTimeString() +
                      '.' +
                      date.getMilliseconds().toString().padStart(3, '0')
                    );
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                  } catch (e) {
                    return timestamp;
                  }
                };
                return (
                  <tr
                    key={event.id}
                    data-selected={selectedEvent?.id === event.id}
                    className="cursor-pointer border-b border-[var(--zl-border)] text-[var(--zl-text)] transition-colors duration-500 odd:bg-[var(--zl-surface)]/40 hover:bg-[var(--zl-surface-2)] data-[selected=true]:bg-[var(--zl-surface-2)]"
                    onClick={() => openEventDrawer(event)}
                  >
                    {selectedColumns.includes('timestamp') && (
                      <td className="p-2 whitespace-nowrap text-[var(--zl-muted)]">
                        {formatTimestamp(event.timestamp)}
                      </td>
                    )}
                    {selectedColumns.includes('service') && (
                      <td className="p-2">
                        <span className="font-semibold text-[var(--zl-key)]">
                          {event.service || 'unknown'}
                        </span>
                      </td>
                    )}
                    {selectedColumns.includes('level') && (
                      <td className="p-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${severityBadge(
                            event.level,
                          )}`}
                        >
                          {(event.level || 'unknown').toLowerCase()}
                        </span>
                      </td>
                    )}
                    {selectedColumns.includes('message') && (
                      <td className="max-w-md truncate p-2">
                        {event.message}
                      </td>
                    )}
                    <td className="p-2 text-right">
                      <svg
                        className="h-3 w-3 text-[var(--zl-muted)]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <div ref={streamEndRef} />
      </div>

      <footer className="flex items-center justify-between border-t border-[var(--zl-border)] bg-[var(--zl-surface)] px-3 py-1.5 text-xs text-[var(--zl-muted)]">
        <span>
          {visibleEvents.length} of {events.length} events in window
        </span>
        <span className="tracking-widest">LOG-ZILLA</span>
      </footer>

      <ConfigProvider theme={antdTheme}>
        <Modal
          title="Purge stored logs"
          open={isPurgeModalVisible}
          onOk={handlePurgeOk}
          onCancel={handlePurgeCancel}
          footer={[
            <button
              key="back"
              onClick={handlePurgeCancel}
              className="mr-2 rounded border border-[var(--zl-border)] bg-[var(--zl-surface)] px-3 py-1.5 text-sm text-[var(--zl-text)] focus:ring-1 focus:ring-[var(--zl-accent)] focus:outline-none"
            >
              Cancel
            </button>,
            <button
              key="submit"
              onClick={handlePurgeOk}
              className="rounded bg-[var(--zl-danger)] px-3 py-1.5 text-sm text-white transition-colors hover:cursor-pointer hover:bg-[var(--zl-danger-strong)]"
            >
              Purge
            </button>,
          ]}
        >
          <div className="space-y-4">
            <p className="text-xs text-[var(--zl-muted)]">
              Deletes matching logs from the database. This cannot be undone.
            </p>
            <div>
              <label className="block text-sm font-medium text-[var(--zl-muted)]">
                Source
              </label>
              <select
                value={purgeService}
                onChange={(e) => setPurgeService(e.target.value)}
                className="mt-1 block w-full rounded border border-[var(--zl-border)] bg-[var(--zl-surface)] px-3 py-1.5 text-sm text-[var(--zl-text)] focus:ring-1 focus:ring-[var(--zl-accent)] focus:outline-none"
              >
                <option value="">All sources</option>
                {services.map((service) => (
                  <option key={service} value={service}>
                    {service}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--zl-muted)]">
                Age
              </label>
              <select
                value={purgeTimeframe}
                onChange={(e) => setPurgeTimeframe(e.target.value)}
                className="mt-1 block w-full rounded border border-[var(--zl-border)] bg-[var(--zl-surface)] px-3 py-1.5 text-sm text-[var(--zl-text)] focus:ring-1 focus:ring-[var(--zl-accent)] focus:outline-none"
              >
                <option value="7d">Older than 7 days</option>
                <option value="14d">Older than 14 days</option>
                <option value="30d">Older than 30 days</option>
                <option value="all">Everything</option>
              </select>
            </div>
          </div>
        </Modal>
      </ConfigProvider>

      <div
        className={`fixed inset-y-0 right-0 z-10 w-1/3 overflow-auto border-l border-[var(--zl-border)] bg-[var(--zl-surface)] font-mono shadow-lg transition-transform duration-300 ${drawerOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {drawerOpen && selectedEvent && (
          <>
            <div className="sticky top-0 flex items-center justify-between border-b border-[var(--zl-border)] bg-[var(--zl-surface)] p-3">
              <h3 className="text-sm font-semibold text-[var(--zl-accent)]">
                Event Inspector
              </h3>
              <button
                onClick={closeDrawer}
                className="text-[var(--zl-muted)] hover:text-[var(--zl-text)]"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="border-b border-[var(--zl-border)] bg-[var(--zl-surface-2)] p-3">
              <div className="mb-2">
                <div className="text-xs text-[var(--zl-muted)]">Timestamp</div>
                <div className="text-sm text-[var(--zl-text)]">
                  {new Date(selectedEvent.timestamp).toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-xs text-[var(--zl-muted)]">Event</div>
                <div className="text-sm break-words whitespace-pre-wrap text-[var(--zl-text)]">
                  {selectedEvent.message}
                </div>
              </div>
            </div>

            <div className="p-3">
              <div className="mb-2 flex items-center justify-between text-xs text-[var(--zl-accent)]">
                <span>Attributes</span>
                <div className="flex items-center">
                  <button
                    onClick={() => setIsFormatted(true)}
                    className={`rounded-l-md px-2 py-0.5 text-xs ${
                      isFormatted
                        ? 'bg-[var(--zl-accent)] text-white'
                        : 'bg-[var(--zl-surface-2)] text-[var(--zl-muted)]'
                    }`}
                  >
                    Flattened
                  </button>
                  <button
                    onClick={() => setIsFormatted(false)}
                    className={`rounded-r-md px-2 py-0.5 text-xs ${
                      !isFormatted
                        ? 'bg-[var(--zl-accent)] text-white'
                        : 'bg-[var(--zl-surface-2)] text-[var(--zl-muted)]'
                    }`}
                  >
                    Raw
                  </button>
                </div>
              </div>
              <div className="space-y-1 rounded bg-[var(--zl-surface-2)] p-2">
                {Object.entries(
                  isFormatted
                    ? flattenObject(
                        Object.fromEntries(
                          Object.entries(selectedEvent).filter(
                            ([key]) =>
                              !['id', 'timestamp', 'message'].includes(key),
                          ),
                        ),
                      )
                    : Object.fromEntries(
                        Object.entries(selectedEvent).filter(
                          ([key]) =>
                            !['id', 'timestamp', 'message'].includes(key),
                        ),
                      ),
                ).map(([key, value]) => (
                  <div
                    key={key}
                    className="group flex items-start justify-between"
                  >
                    <div className="flex-grow overflow-hidden">
                      <span className="text-xs" style={{ color: colors.key }}>
                        {key}:{' '}
                      </span>
                      <span
                        className="ml-2 text-xs break-all whitespace-pre-wrap"
                        style={{ color: colors.value }}
                      >
                        {typeof value === 'object' && value !== null
                          ? JSON.stringify(value)
                          : String(value)}
                      </span>
                    </div>
                    <div className="flex items-center opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={() => copyToClipboard(key, value)}
                        className="rounded p-1 text-[var(--zl-muted)] hover:bg-[var(--zl-border)] hover:text-[var(--zl-text)]"
                        title="Copy value"
                      >
                        {copiedKey === key ? (
                          <Check size={14} className="text-[var(--zl-ok)]" />
                        ) : (
                          <Copy size={14} />
                        )}
                      </button>
                      <button
                        onClick={() => addFilterFromDrawer(key, value)}
                        className="rounded p-1 text-[var(--zl-muted)] hover:bg-[var(--zl-border)] hover:text-[var(--zl-text)]"
                        title={`Filter by ${key}`}
                      >
                        <FilterIcon size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default StreamConsole;
