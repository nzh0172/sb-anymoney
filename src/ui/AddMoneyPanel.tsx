/**
 * Example Panel Component
 * Demonstrates how to create React components for Subway Builder mods.
 *
 * Note: Floating panels provide their own container, so don't wrap in Card.
 */

import { useEffect, useRef, useState } from 'react';
import manifest from '../../manifest.json';

const api = window.SubwayBuilderAPI;
const storage = window.electron;

const STORAGE_KEY = `${manifest.id}:construction-cost-presets`;

type ConstructionCosts = any;

type SavedPreset = {
  constructionCosts: ConstructionCosts;
  updatedAt: string;
};

type PresetStorageState = {
  version: 1;
  currentSettings: ConstructionCosts;
  selectedPresetName: string;
  presets: Record<string, SavedPreset>;
};

const defaultConstructionCosts = {
  TUNNEL: { SINGLE_MULTIPLIER: 0.75, QUAD_MULTIPLIER: 1.5 },
  STATION: { SINGLE_MULTIPLIER: 0.75, QUAD_MULTIPLIER: 1.5 },
  ELEVATION_MULTIPLIERS: {
    DEEP_BORE: 4.5,
    STANDARD_TUNNEL: 2.0,
    CUT_AND_COVER: 1.0,
    AT_GRADE: 0.3,
    ELEVATED: 0.8,
  },
  WATER_MULTIPLIERS: {
    DEEP_BORE: 1.44444,
    STANDARD_TUNNEL: 1.5,
    CUT_AND_COVER: 3.0,
    AT_GRADE: 10.0,
    ELEVATED: 2.5,
  },
  ELEVATION_THRESHOLDS: {
    DEEP_BORE: -100,
    STANDARD_TUNNEL: -24,
    CUT_AND_COVER: -10,
    AT_GRADE: -3,
    ELEVATED: 4.5,
  },
};

const cloneConstructionCosts = (costs: ConstructionCosts) => JSON.parse(JSON.stringify(costs));

const normalizeNumericValue = (value: unknown) => (
  typeof value === 'number' && Number.isFinite(value) ? value : 0
);

const parseConstructionInput = (value: string) => {
  if (value === '') {
    return '';
  }

  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : '';
};

const normalizeAmountValue = (value: string) => {
  const sanitized = value.replace(/[^\d]/g, '');
  if (sanitized === '') {
    return 0;
  }

  const parsed = Number(sanitized);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
};

const formatAmountInput = (value: string) => {
  const sanitized = value.replace(/[^\d]/g, '');
  if (sanitized === '') {
    return '';
  }

  return normalizeAmountValue(sanitized).toLocaleString();
};

const normalizeConstructionCosts = (costs: ConstructionCosts) => {
  const baseCosts = cloneConstructionCosts(defaultConstructionCosts);
  const sourceCosts = costs ?? {};

  return {
    ...baseCosts,
    ...sourceCosts,
    TUNNEL: {
      ...baseCosts.TUNNEL,
      ...sourceCosts.TUNNEL,
      SINGLE_MULTIPLIER: normalizeNumericValue(sourceCosts.TUNNEL?.SINGLE_MULTIPLIER),
      QUAD_MULTIPLIER: normalizeNumericValue(sourceCosts.TUNNEL?.QUAD_MULTIPLIER),
    },
    STATION: {
      ...baseCosts.STATION,
      ...sourceCosts.STATION,
      SINGLE_MULTIPLIER: normalizeNumericValue(sourceCosts.STATION?.SINGLE_MULTIPLIER),
      QUAD_MULTIPLIER: normalizeNumericValue(sourceCosts.STATION?.QUAD_MULTIPLIER),
    },
    ELEVATION_MULTIPLIERS: {
      ...baseCosts.ELEVATION_MULTIPLIERS,
      ...sourceCosts.ELEVATION_MULTIPLIERS,
      AT_GRADE: normalizeNumericValue(sourceCosts.ELEVATION_MULTIPLIERS?.AT_GRADE),
      STANDARD_TUNNEL: normalizeNumericValue(sourceCosts.ELEVATION_MULTIPLIERS?.STANDARD_TUNNEL),
      ELEVATED: normalizeNumericValue(sourceCosts.ELEVATION_MULTIPLIERS?.ELEVATED),
      DEEP_BORE: normalizeNumericValue(sourceCosts.ELEVATION_MULTIPLIERS?.DEEP_BORE),
      CUT_AND_COVER: normalizeNumericValue(sourceCosts.ELEVATION_MULTIPLIERS?.CUT_AND_COVER),
    },
    WATER_MULTIPLIERS: {
      ...baseCosts.WATER_MULTIPLIERS,
      ...sourceCosts.WATER_MULTIPLIERS,
    },
    ELEVATION_THRESHOLDS: {
      ...baseCosts.ELEVATION_THRESHOLDS,
      ...sourceCosts.ELEVATION_THRESHOLDS,
    },
  };
};

const getDefaultPresetState = (): PresetStorageState => ({
  version: 1,
  currentSettings: cloneConstructionCosts(defaultConstructionCosts),
  selectedPresetName: '',
  presets: {},
});

const parseStoredPresetState = (data: unknown): PresetStorageState => {
  const fallbackState = getDefaultPresetState();

  if (!data || typeof data !== 'object') {
    return fallbackState;
  }

  const rawState = data as Partial<PresetStorageState>;
  const rawPresets = rawState.presets;
  const presets: Record<string, SavedPreset> = {};

  if (rawPresets && typeof rawPresets === 'object') {
    for (const [name, preset] of Object.entries(rawPresets)) {
      if (!name || !preset || typeof preset !== 'object') {
        continue;
      }

      const rawPreset = preset as Partial<SavedPreset>;
      presets[name] = {
        constructionCosts: normalizeConstructionCosts(rawPreset.constructionCosts),
        updatedAt: typeof rawPreset.updatedAt === 'string' ? rawPreset.updatedAt : '',
      };
    }
  }

  return {
    version: 1,
    currentSettings: normalizeConstructionCosts(rawState.currentSettings),
    selectedPresetName: typeof rawState.selectedPresetName === 'string' ? rawState.selectedPresetName : '',
    presets,
  };
};

// Cast components to any to bypass strict typing (components work at runtime)
const { Button, Input } = api.utils.components as Record<string, React.ComponentType<any>>;
const {
  ChevronDown,
  ChevronUp,
  Minus,
  Plus,
} = api.utils.icons as Record<string, React.ComponentType<any>>;

export function ExamplePanel() {
  const [amountInput, setAmountInput] = useState('100000');
  const [constructionCosts, setConstructionCosts] = useState<ConstructionCosts>(
    cloneConstructionCosts(defaultConstructionCosts),
  );
  const [savedPresets, setSavedPresets] = useState<Record<string, SavedPreset>>({});
  const [selectedPresetName, setSelectedPresetName] = useState('');
  const [presetNameInput, setPresetNameInput] = useState('');
  const [presetsLoaded, setPresetsLoaded] = useState(false);
  const [warningsExpanded, setWarningsExpanded] = useState(false);
  const [presetsExpanded, setPresetsExpanded] = useState(true);

  const amount = normalizeAmountValue(amountInput);
  const incrementRef = useRef<NodeJS.Timeout | null>(null);
  const decrementRef = useRef<NodeJS.Timeout | null>(null);
  const latestConstructionCostsRef = useRef<ConstructionCosts>(
    cloneConstructionCosts(defaultConstructionCosts),
  );

  const presetEntries = Object.entries(savedPresets).sort(([leftName], [rightName]) => (
    leftName.localeCompare(rightName)
  ));
  const storageAvailable = Boolean(storage?.getStorageItem && storage?.setStorageItem);

  const persistPresetState = async (
    nextCurrentSettings: ConstructionCosts,
    nextPresets: Record<string, SavedPreset>,
    nextSelectedPresetName: string,
  ) => {
    if (!storageAvailable) {
      return;
    }

    const payload: PresetStorageState = {
      version: 1,
      currentSettings: normalizeConstructionCosts(nextCurrentSettings),
      selectedPresetName: nextSelectedPresetName,
      presets: nextPresets,
    };

    try {
      await storage!.setStorageItem(STORAGE_KEY, payload);
    } catch (error) {
      console.warn('Could not persist construction presets', error);
    }
  };

  const applyConstructionCostsToGame = (nextCosts: ConstructionCosts) => {
    const normalizedCosts = normalizeConstructionCosts(nextCosts);
    latestConstructionCostsRef.current = normalizedCosts;
    api.modifyConstants({ CONSTRUCTION_COSTS: normalizedCosts });
    return normalizedCosts;
  };

  const handleAddMoney = () => {
    api.actions.addMoney(amount);
    api.ui.showNotification(`Added $${amount.toLocaleString()} to your budget!`, 'success');
  };

  const incrementAmount = () => {
    setAmountInput(String(amount + 100_000));
  };

  const decrementAmount = () => {
    setAmountInput(String(Math.max(0, amount - 100_000)));
  };

  const startIncrement = () => {
    incrementAmount();
    incrementRef.current = setInterval(incrementAmount, 100);
  };

  const stopIncrement = () => {
    if (incrementRef.current) {
      clearInterval(incrementRef.current);
      incrementRef.current = null;
    }
  };

  const startDecrement = () => {
    decrementAmount();
    decrementRef.current = setInterval(decrementAmount, 100);
  };

  const stopDecrement = () => {
    if (decrementRef.current) {
      clearInterval(decrementRef.current);
      decrementRef.current = null;
    }
  };

  useEffect(() => {
    const loadConstructionState = async () => {
      let baseCosts = cloneConstructionCosts(defaultConstructionCosts);

      try {
        const constants = api.utils.getConstants();
        if (constants?.CONSTRUCTION_COSTS) {
          baseCosts = cloneConstructionCosts(constants.CONSTRUCTION_COSTS);
        }
      } catch (error) {
        console.warn('Could not read game constants', error);
      }

      let nextConstructionCosts = normalizeConstructionCosts(baseCosts);
      let nextSelectedPresetName = '';
      let nextPresetNameInput = '';
      let nextSavedPresets: Record<string, SavedPreset> = {};
      let shouldRestoreToGame = false;

      if (storageAvailable) {
        try {
          const response = await storage!.getStorageItem(STORAGE_KEY);

          if (response?.success) {
            const storedState = parseStoredPresetState(response.data);
            nextSavedPresets = storedState.presets;
            nextSelectedPresetName = storedState.presets[storedState.selectedPresetName]
              ? storedState.selectedPresetName
              : '';
            nextPresetNameInput = nextSelectedPresetName;
            nextConstructionCosts = normalizeConstructionCosts(storedState.currentSettings);
            shouldRestoreToGame = true;
          }
        } catch (error) {
          console.warn('Could not load construction presets', error);
        }
      }

      latestConstructionCostsRef.current = nextConstructionCosts;
      setSavedPresets(nextSavedPresets);
      setSelectedPresetName(nextSelectedPresetName);
      setPresetNameInput(nextPresetNameInput);
      setConstructionCosts(nextConstructionCosts);

      if (shouldRestoreToGame) {
        api.modifyConstants({ CONSTRUCTION_COSTS: nextConstructionCosts });
      }

      setPresetsLoaded(true);
    };

    void loadConstructionState();
  }, [storageAvailable]);

  useEffect(() => {
    latestConstructionCostsRef.current = normalizeConstructionCosts(constructionCosts);
  }, [constructionCosts]);

  useEffect(() => {
    api.hooks.onGameLoaded(() => {
      api.modifyConstants({ CONSTRUCTION_COSTS: latestConstructionCostsRef.current });
    });
  }, []);

  useEffect(() => () => {
    if (incrementRef.current) {
      clearInterval(incrementRef.current);
    }

    if (decrementRef.current) {
      clearInterval(decrementRef.current);
    }
  }, []);

  useEffect(() => {
    if (!presetsLoaded || !storageAvailable) {
      return undefined;
    }

    const persistTimer = setTimeout(() => {
      void persistPresetState(constructionCosts, savedPresets, selectedPresetName);
    }, 250);

    return () => clearTimeout(persistTimer);
  }, [
    constructionCosts,
    persistPresetState,
    presetsLoaded,
    savedPresets,
    selectedPresetName,
    storageAvailable,
  ]);

  const resetConstructionConstants = () => {
    const defaults = cloneConstructionCosts(defaultConstructionCosts);
    const normalizedDefaults = applyConstructionCostsToGame(defaults);
    setConstructionCosts(normalizedDefaults);
    api.ui.showNotification('Construction constants reset to normal.', 'success');
  };

  const applyConstructionConstants = () => {
    const normalizedCosts = applyConstructionCostsToGame(constructionCosts);
    setConstructionCosts(normalizedCosts);
    api.ui.showNotification('Construction constants updated.', 'success');
  };

  const savePreset = () => {
    const name = presetNameInput.trim();

    if (!name) {
      api.ui.showNotification('Enter a preset name before saving.', 'error');
      return;
    }

    const normalizedCosts = normalizeConstructionCosts(constructionCosts);
    const nextPresets = {
      ...savedPresets,
      [name]: {
        constructionCosts: normalizedCosts,
        updatedAt: new Date().toISOString(),
      },
    };
    const wasExistingPreset = Boolean(savedPresets[name]);

    setConstructionCosts(normalizedCosts);
    setSavedPresets(nextPresets);
    setSelectedPresetName(name);
    setPresetNameInput(name);

    api.ui.showNotification(
      wasExistingPreset ? `Updated preset "${name}".` : `Saved preset "${name}".`,
      'success',
    );
  };

  const loadPreset = () => {
    if (!selectedPresetName) {
      api.ui.showNotification('Select a preset to load.', 'error');
      return;
    }

    const selectedPreset = savedPresets[selectedPresetName];

    if (!selectedPreset) {
      api.ui.showNotification('That preset could not be found.', 'error');
      return;
    }

    const normalizedCosts = applyConstructionCostsToGame(selectedPreset.constructionCosts);
    setConstructionCosts(normalizedCosts);
    setPresetNameInput(selectedPresetName);
    api.ui.showNotification(`Loaded preset "${selectedPresetName}".`, 'success');
  };

  const deletePreset = () => {
    if (!selectedPresetName) {
      api.ui.showNotification('Select a preset to delete.', 'error');
      return;
    }

    const { [selectedPresetName]: deletedPreset, ...remainingPresets } = savedPresets;

    if (!deletedPreset) {
      api.ui.showNotification('That preset could not be found.', 'error');
      return;
    }

    setSavedPresets(remainingPresets);
    setSelectedPresetName('');
    setPresetNameInput('');
    api.ui.showNotification(`Deleted preset "${selectedPresetName}".`, 'success');
  };

  const setNestedConstructionValue = (section: string, field: string, value: string) => {
    setConstructionCosts((prev: ConstructionCosts) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: parseConstructionInput(value),
      },
    }));
  };

  const setNestedElevationValue = (elevationType: string, value: string) => {
    setConstructionCosts((prev: ConstructionCosts) => ({
      ...prev,
      ELEVATION_MULTIPLIERS: {
        ...prev.ELEVATION_MULTIPLIERS,
        [elevationType]: parseConstructionInput(value),
      },
    }));
  };

  return (
    <div
      className="h-full overflow-y-auto p-3"
      style={{ display: 'flex', gap: '1rem', alignItems: 'stretch' }}
    >
      <div className="flex flex-col gap-3" style={{ width: '280px', flexShrink: 0 }}>
        <h3 className="text-sm font-medium">Top-up Expenses</h3>

        <div className="text-xs text-muted-foreground">
          Add money into your expenses budget.
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onMouseDown={startDecrement}
            onMouseUp={stopDecrement}
            onMouseLeave={stopDecrement}
            onTouchStart={startDecrement}
            onTouchEnd={stopDecrement}
            disabled={amount <= 0}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Input
            type="text"
            inputMode="numeric"
            value={formatAmountInput(amountInput)}
            onChange={(e: any) => setAmountInput(e.target.value.replace(/[^\d]/g, ''))}
            className="text-center"
          />
          <Button
            variant="outline"
            size="sm"
            onMouseDown={startIncrement}
            onMouseUp={stopIncrement}
            onMouseLeave={stopIncrement}
            onTouchStart={startIncrement}
            onTouchEnd={stopIncrement}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setAmountInput('100000')}
            className="px-2 py-1 text-xs"
          >
            100K
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setAmountInput('1000000')}
            className="px-2 py-1 text-xs"
          >
            1M
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setAmountInput('10000000')}
            className="px-2 py-1 text-xs"
          >
            10M
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setAmountInput('100000000')}
            className="px-2 py-1 text-xs"
          >
            100M
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setAmountInput('1000000000')}
            className="col-span-2 px-2 py-1 text-xs"
          >
            1B
          </Button>
        </div>
        <Button onClick={handleAddMoney}>
          Add Money
        </Button>
      </div>

      <div className="border-l border-muted-foreground/20 pl-4" style={{ minWidth: 0, flex: 1 }}>
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-medium">Construction Costs</h3>
          <div className="text-[11px] text-muted-foreground">
            {presetEntries.length} preset{presetEntries.length === 1 ? '' : 's'}
          </div>
        </div>
        <div className="pt-3 text-xs text-muted-foreground">
          Change construction cost multipliers and elevation multipliers.
        </div>
        <div className="mt-3 rounded-md border border-yellow-500/40 bg-yellow-500/10 p-3 text-xs text-yellow-200">
          <button
            type="button"
            onClick={() => setWarningsExpanded((current) => !current)}
            className="flex w-full items-center justify-between text-left"
          >
            <span className="font-medium uppercase tracking-wide text-yellow-100">Warning</span>
            {warningsExpanded ? (
              <ChevronUp className="h-4 w-4 text-yellow-100/80" />
            ) : (
              <ChevronDown className="h-4 w-4 text-yellow-100/80" />
            )}
          </button>
          {warningsExpanded && (
            <div className="mt-2 space-y-1">
              <div>- Construction costs cannot be changed if there's an existing blueprint. Clear the blueprint first.</div>
              <div>- Elevation multiplier changes applied immediately, and appear after your next action, like dragging or clicking a button.</div>
            </div>
          )}
        </div>

        <div className="mt-3 rounded-md border border-muted-foreground/20 p-3">
          <button
            type="button"
            onClick={() => setPresetsExpanded((current) => !current)}
            className="flex w-full items-center justify-between text-left"
          >
            <span className="text-xs font-medium">Saved Presets</span>
            {presetsExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>

          {presetsExpanded && (
            <>
              <div className="mt-2 text-xs text-muted-foreground">
                Save your current construction settings and reload them later.
              </div>

              {!storageAvailable ? (
                <div className="mt-3 text-xs text-yellow-200">
                  Preset storage is unavailable in this environment.
                </div>
              ) : (
                <>
                  <div className="mt-3 grid gap-2">
                    <Input
                      type="text"
                      value={presetNameInput}
                      onChange={(e: any) => setPresetNameInput(e.target.value)}
                      placeholder="Preset name"
                      className="text-xs"
                    />
                    <select
                      value={selectedPresetName}
                      onChange={(e) => {
                        setSelectedPresetName(e.target.value);
                        if (e.target.value) {
                          setPresetNameInput(e.target.value);
                        }
                      }}
                      className="h-9 rounded-md border border-input bg-background px-3 text-xs text-foreground"
                      disabled={!presetsLoaded || presetEntries.length === 0}
                    >
                      <option value="">
                        {presetEntries.length === 0 ? 'No presets saved yet' : 'Select a preset'}
                      </option>
                      {presetEntries.map(([name, preset]) => (
                        <option key={name} value={name}>
                          {name}{preset.updatedAt ? ` (${new Date(preset.updatedAt).toLocaleDateString()})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <Button variant="secondary" onClick={savePreset} className="w-full">
                      Save
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={loadPreset}
                      className="w-full"
                      disabled={!selectedPresetName}
                    >
                      Load
                    </Button>
                    <Button
                      variant="outline"
                      onClick={deletePreset}
                      className="w-full"
                      disabled={!selectedPresetName}
                    >
                      Delete
                    </Button>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2">
          <div>
            <div className="text-xs font-medium">Tunnel cost</div>

            <div className="mt-1 flex gap-2">
              <div className="grid grid-cols-1 gap-2">
                <div className="text-xs font-medium text-muted-foreground">Single</div>
                <Input
                  type="number"
                  value={constructionCosts.TUNNEL?.SINGLE_MULTIPLIER ?? ''}
                  onChange={(e: any) => setNestedConstructionValue('TUNNEL', 'SINGLE_MULTIPLIER', e.target.value)}
                  className="w-full text-xs"
                  step="0.1"
                />
              </div>
              <div className="grid grid-cols-1 gap-2">
                <div className="text-xs font-medium text-muted-foreground">Quad</div>
                <Input
                  type="number"
                  value={constructionCosts.TUNNEL?.QUAD_MULTIPLIER ?? ''}
                  onChange={(e: any) => setNestedConstructionValue('TUNNEL', 'QUAD_MULTIPLIER', e.target.value)}
                  className="w-full text-xs"
                  step="0.1"
                />
              </div>
            </div>
          </div>

          <div>
            <div className="text-xs font-medium">Station cost</div>

            <div className="mt-1 flex gap-2">
              <div className="grid grid-cols-1 gap-2">
                <div className="text-xs font-medium text-muted-foreground">Single</div>
                <Input
                  type="number"
                  value={constructionCosts.STATION?.SINGLE_MULTIPLIER ?? ''}
                  onChange={(e: any) => setNestedConstructionValue('STATION', 'SINGLE_MULTIPLIER', e.target.value)}
                  className="w-full text-xs"
                  step="0.1"
                />
              </div>
              <div className="grid grid-cols-1 gap-2">
                <div className="text-xs font-medium text-muted-foreground">Quad</div>
                <Input
                  type="number"
                  value={constructionCosts.STATION?.QUAD_MULTIPLIER ?? ''}
                  onChange={(e: any) => setNestedConstructionValue('STATION', 'QUAD_MULTIPLIER', e.target.value)}
                  className="w-full text-xs"
                  step="0.1"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-2 grid gap-2">
          <div className="text-xs font-medium">Elevation Multipliers</div>

          <div className="mt-1 flex gap-2">
            <div className="grid grid-cols-1 gap-2">
              <div className="text-xs font-medium text-muted-foreground">Deep Bore</div>
              <Input
                type="number"
                value={constructionCosts.ELEVATION_MULTIPLIERS?.DEEP_BORE ?? ''}
                onChange={(e: any) => setNestedElevationValue('DEEP_BORE', e.target.value)}
                className="w-full text-xs"
                step="0.1"
              />
            </div>

            <div className="grid grid-cols-1 gap-2">
              <div className="text-xs font-medium text-muted-foreground">Standard Tunnel</div>
              <Input
                type="number"
                value={constructionCosts.ELEVATION_MULTIPLIERS?.STANDARD_TUNNEL ?? ''}
                onChange={(e: any) => setNestedElevationValue('STANDARD_TUNNEL', e.target.value)}
                className="w-full text-xs"
                step="0.1"
              />
            </div>

            <div className="grid grid-cols-1 gap-2">
              <div className="text-xs font-medium text-muted-foreground">Cut and Cover</div>
              <Input
                type="number"
                value={constructionCosts.ELEVATION_MULTIPLIERS?.CUT_AND_COVER ?? ''}
                onChange={(e: any) => setNestedElevationValue('CUT_AND_COVER', e.target.value)}
                className="w-full text-xs"
                step="0.1"
              />
            </div>
          </div>

          <div className="mt-1 flex gap-2">
            <div className="grid grid-cols-1 gap-2">
              <div className="text-xs font-medium text-muted-foreground">At Grade</div>
              <Input
                type="number"
                value={constructionCosts.ELEVATION_MULTIPLIERS?.AT_GRADE ?? ''}
                onChange={(e: any) => setNestedElevationValue('AT_GRADE', e.target.value)}
                className="w-full text-xs"
                step="0.1"
              />
            </div>

            <div className="grid grid-cols-1 gap-2">
              <div className="text-xs font-medium text-muted-foreground">Elevated</div>
              <Input
                type="number"
                value={constructionCosts.ELEVATION_MULTIPLIERS?.ELEVATED ?? ''}
                onChange={(e: any) => setNestedElevationValue('ELEVATED', e.target.value)}
                className="w-full text-xs"
                step="0.1"
              />
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2">
          <Button onClick={applyConstructionConstants} className="w-full">
            Apply Construction Costs
          </Button>
          <Button variant="secondary" onClick={resetConstructionConstants} className="w-full">
            Reset to Default
          </Button>
        </div>
      </div>
    </div>
  );
}
