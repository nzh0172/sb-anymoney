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
  const [amount, setAmount] = useState(100_000);
  const [routeFares, setRouteFares] = useState<Record<string, number>>({});
  const [selectedRoute, setSelectedRoute] = useState<string>('');
  const [routes, setRoutes] = useState<any[]>([]);
  const [routesLoaded, setRoutesLoaded] = useState(false);
  const incrementRef = useRef<NodeJS.Timeout | null>(null);
  const decrementRef = useRef<NodeJS.Timeout | null>(null);

  // // Load routes when component mounts
  // useEffect(() => {
  //   const loadRoutes = () => {
  //     try {
  //       const gameRoutes = api.gameState.getRoutes();
  //       setRoutes(gameRoutes);
  //       setRoutesLoaded(true);
        
  //       console.log('Routes loaded in AddMoneyPanel:', gameRoutes.map(r => ({ 
  //         id: r.id, 
  //         name: r.name, 
  //         bullet: r.bullet 
  //       })));
  //     } catch (error) {
  //       console.error('Failed to load routes:', error);
  //     }
  //   };

  //   // Try to load routes immediately
  //   loadRoutes();
    
  //   // Also try again after a short delay in case map isn't ready yet
  //   const timeoutId = setTimeout(loadRoutes, 1000);
    
  //   return () => clearTimeout(timeoutId);
  // }, []);

  const handleAddMoney = () => {
    api.actions.addMoney(amount);
    api.ui.showNotification(`Added $${amount.toLocaleString()} to your budget!`, 'success');
  };



  const incrementAmount = () => setAmount(prev => prev + 100_000);
  const decrementAmount = () => setAmount(prev => Math.max(0, prev - 100_000));

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

  return (
    <div className="flex flex-col gap-3 p-3">
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
          value={amount.toLocaleString()}
          onChange={(e: any) => {
            const value = e.target.value.replace(/,/g, ''); // Remove commas for parsing
            const numValue = value === '' ? 0 : Math.max(0, parseInt(value) || 0);
            setAmount(numValue);
          }}
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
          onClick={() => setAmount(100_000)}
          className="text-xs px-2 py-1"
        >
          100K
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setAmount(1_000_000)}
          className="text-xs px-2 py-1"
        >
          1M
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setAmount(10_000_000)}
          className="text-xs px-2 py-1"
        >
          10M
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setAmount(100_000_000)}
          className="text-xs px-2 py-1"
        >
          100M
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setAmount(1_000_000_000)}
          className="text-xs px-2 py-1"
        >
          1B
        </Button>
      </div>
      <Button onClick={handleAddMoney}>
        Add Money
      </Button>

      {/* Route-Specific Fares UI */}
      <hr />
      
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-medium">Route-Specific Fares</h3>
        
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">Global Fare Multiplier (default: 365):</span>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              defaultValue="365"
              onChange={(e: any) => {
                const value = parseInt(e.target.value) || 365;
                api.modifyConstants({ FARE_MULTIPLIER: value });
                // api.ui.showNotification(`Fare multiplier set to ${value}`, 'info');
              }}
              className="w-20 text-xs"
              min="1"
              max="2000"
            />
          </div>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">Select Route:</span>
          <div className="flex items-center gap-2">
            <select
              value={selectedRoute}
              onChange={(e) => setSelectedRoute(e.target.value)}
              className="text-xs px-2 py-1 border rounded text-foreground bg-background"
              disabled={!routesLoaded}
            >
              <option value="">
                {routesLoaded ? 'Choose a route...' : 'Loading routes...'}
              </option>
              {routes && routes.length > 0 ? routes.map((route) => (
                <option value={route.bullet}>
                  {route?.name || route?.bullet || `Route ${route.id}`}
                </option>
              )) : (
                <option disabled>No routes available</option>
              )}
            </select>
          </div>
        </div>
        
        {selectedRoute && (
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Fare Price:</span>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={routeFares[selectedRoute] || 3}
                onChange={(e: any) => {
                  const price = parseFloat(e.target.value) || 3;
                  setRouteFares(prev => ({
                    ...prev,
                    [selectedRoute]: price
                  }));
                }}
                className="w-20 text-xs"
                min="0.25"
                max="50"
                step="0.25"
              />
              <Button
                size="sm"
                onClick={() => {
                  const route = routes?.find(r => r.id === selectedRoute);
                  const fare = routeFares[selectedRoute] || 3;
                  api.ui.showNotification(
                    `Route ${route?.name || route?.bullet || selectedRoute} fare set to $${fare.toFixed(2)}`,
                    'success'
                  );
                }}
                className="text-xs px-2 py-1"
              >
                Set Fare
              </Button>
            </div>
          </div>
        )}
        
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">Current Route Fares:</span>
          <div className="max-h-32 overflow-y-auto">
            {Object.entries(routeFares).length === 0 ? (
              <span className="text-xs text-muted-foreground">No custom fares set</span>
            ) : (
              Object.entries(routeFares).map(([routeId, fare]) => {
                const route = routes?.find(r => r.id === routeId);
                return (
                  <div key={routeId} className="text-xs text-foreground">
                    {`${route?.name || route?.bullet || `Route ${routeId}`} - $${fare.toFixed(2)}`}
                  </div>
                );
              })
            )}
          </div>
        </div>
        
        <div className="flex flex-col gap-2">
          <Button
            size="sm"
            onClick={() => {
              // Apply route-specific pricing logic
              // This is conceptual - actual implementation would require hooking into revenue system
              const totalRoutes = Object.keys(routeFares).length;
              api.ui.showNotification(
                `Route-specific fares configured for ${totalRoutes} routes`,
                'info'
              );
            }}
            className="w-full text-sm"
          >
            Apply Route Fares
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setRouteFares({});
              setSelectedRoute('');
              api.ui.showNotification('All route fares reset to default', 'info');
            }}
            className="w-full text-sm"
          >
            Reset All
          </Button>
        </div>
      </div>
      
    </div>
    
  );
}
