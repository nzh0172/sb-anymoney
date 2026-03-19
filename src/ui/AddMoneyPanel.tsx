/**
 * Example Panel Component
 * Demonstrates how to create React components for Subway Builder mods.
 *
 * Note: Floating panels provide their own container, so don't wrap in Card.
 */

import { useState, useRef, useEffect } from 'react';

const api = window.SubwayBuilderAPI;

// Cast components to any to bypass strict typing (components work at runtime)
const { Button, Input } = api.utils.components as Record<string, React.ComponentType<any>>;
const { Minus, Plus } = api.utils.icons as Record<string, React.ComponentType<any>>;

export function ExamplePanel() {
  // Get original game constants
  const cloneConstructionCosts = (costs: any) => JSON.parse(JSON.stringify(costs));
  const normalizeNumericValue = (value: any) => (
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
  const normalizeConstructionCosts = (costs: any) => ({
    ...costs,
    TUNNEL: {
      ...costs.TUNNEL,
      SINGLE_MULTIPLIER: normalizeNumericValue(costs.TUNNEL?.SINGLE_MULTIPLIER),
      QUAD_MULTIPLIER: normalizeNumericValue(costs.TUNNEL?.QUAD_MULTIPLIER),
    },
    STATION: {
      ...costs.STATION,
      SINGLE_MULTIPLIER: normalizeNumericValue(costs.STATION?.SINGLE_MULTIPLIER),
      QUAD_MULTIPLIER: normalizeNumericValue(costs.STATION?.QUAD_MULTIPLIER),
    },
    ELEVATION_MULTIPLIERS: {
      ...costs.ELEVATION_MULTIPLIERS,
      AT_GRADE: normalizeNumericValue(costs.ELEVATION_MULTIPLIERS?.AT_GRADE),
      STANDARD_TUNNEL: normalizeNumericValue(costs.ELEVATION_MULTIPLIERS?.STANDARD_TUNNEL),
      ELEVATED: normalizeNumericValue(costs.ELEVATION_MULTIPLIERS?.ELEVATED),
      DEEP_BORE: normalizeNumericValue(costs.ELEVATION_MULTIPLIERS?.DEEP_BORE),
      CUT_AND_COVER: normalizeNumericValue(costs.ELEVATION_MULTIPLIERS?.CUT_AND_COVER),
    },
    WATER_MULTIPLIERS: {
      ...costs.WATER_MULTIPLIERS,
    },
    ELEVATION_THRESHOLDS: {
      ...costs.ELEVATION_THRESHOLDS,
    },
  });
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
  const [amountInput, setAmountInput] = useState('100000');
  const amount = normalizeAmountValue(amountInput);

  const incrementRef = useRef<NodeJS.Timeout | null>(null);
  const decrementRef = useRef<NodeJS.Timeout | null>(null);
  const initialConstructionCostsRef = useRef<any>(cloneConstructionCosts(defaultConstructionCosts));


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
    incrementAmount(); // Initial increment
    incrementRef.current = setInterval(incrementAmount, 100); // Continue incrementing every 100ms
  };

  const stopIncrement = () => {
    if (incrementRef.current) {
      clearInterval(incrementRef.current);
      incrementRef.current = null;
    }
  };

  const startDecrement = () => {
    decrementAmount(); // Initial decrement
    decrementRef.current = setInterval(decrementAmount, 100); // Continue decrementing every 100ms
  };


  const stopDecrement = () => {
    if (decrementRef.current) {
      clearInterval(decrementRef.current);
      decrementRef.current = null;
    }
  };

  const [constructionCosts, setConstructionCosts] = useState<any>({
    ...defaultConstructionCosts,
  });

  useEffect(() => {
    try {
      const constants = api.utils.getConstants();
      console.log('Game constants:', constants);
      if (constants?.CONSTRUCTION_COSTS) {
        const initialCosts = cloneConstructionCosts(constants.CONSTRUCTION_COSTS);
        initialConstructionCostsRef.current = initialCosts;
        setConstructionCosts(initialCosts);
      }
    } catch (error) {
      console.warn('Could not read game constants', error);
    }
  }, []);

  const resetConstructionConstants = () => {
    const defaults = cloneConstructionCosts(defaultConstructionCosts);
    setConstructionCosts(defaults);
    api.modifyConstants({ CONSTRUCTION_COSTS: defaults });
    api.ui.showNotification('Construction constants reset to normal.', 'success');
  };

  const applyConstructionConstants = () => {
    const normalizedCosts = normalizeConstructionCosts(constructionCosts);
    setConstructionCosts(normalizedCosts);
    api.modifyConstants({ CONSTRUCTION_COSTS: normalizedCosts });
    api.ui.showNotification('Construction constants updated.', 'success');
  };

  const setNestedConstructionValue = (section: string, field: string, value: string) => {
    setConstructionCosts((prev: any) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: parseConstructionInput(value),
      },
    }));
  };

  const setNestedElevationValue = (elevationType: string, value: string) => {
    setConstructionCosts((prev: any) => ({
      ...prev,
      ELEVATION_MULTIPLIERS: {
        ...prev.ELEVATION_MULTIPLIERS,
        [elevationType]: parseConstructionInput(value),
      },
    }));
  };

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto p-3">
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
      <div className="flex gap-2 justify-center">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setAmountInput('100000')}
          className="text-xs px-2 py-1"
        >
          100K
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setAmountInput('1000000')}
          className="text-xs px-2 py-1"
        >
          1M
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setAmountInput('10000000')}
          className="text-xs px-2 py-1"
        >
          10M
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setAmountInput('100000000')}
          className="text-xs px-2 py-1"
        >
          100M
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setAmountInput('1000000000')}
          className="text-xs px-2 py-1"
        >
          1B
        </Button>
      </div>
      <Button onClick={handleAddMoney}>
        Add Money
      </Button>

      <div className="border-t border-muted-foreground/20 pt-3">
        <h3 className="text-sm font-medium">Construction Costs</h3>
        <div className="text-xs text-muted-foreground pt-3">
          Change construction cost multipliers and elevation multipliers.
        </div>
        <div
          role="alert"
          className="mt-3 rounded-md border border-yellow-500/40 bg-yellow-500/10 p-3 text-xs text-yellow-200"
        >
          <div className="font-medium uppercase tracking-wide text-yellow-100">Warning</div>
          <div className="mt-2 space-y-1">
            <div>- Construction costs cannot be changed if there's an existing blueprint. Clear the blueprint first.</div>
            <div>- Elevation multiplier changes applied immediately, and appear after your next action, like dragging or clicking a button.</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-2">
          <div>
            <div className="text-xs font-medium">Tunnel cost</div>
            
            <div className="flex gap-2 mt-1">
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
            
            <div className="flex gap-2 mt-1">
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





        <div className="grid gap-2 mt-2">
          <div className="text-xs font-medium">Elevation Multipliers</div>

          <div className="flex gap-2 mt-1">
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




            <div className="flex gap-2 mt-1">
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

        <div className="grid grid-cols-1 gap-2 mt-3">
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
