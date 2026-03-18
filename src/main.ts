/**
 * My Subway Builder Mod
 * Entry point for the mod.
 */

import { ExamplePanel } from './ui/AddMoneyPanel';
import manifest from '../manifest.json';

const MOD_ID = manifest.id;
const MOD_VERSION = manifest.version;
const TAG = '[ANYMONEY]';

const api = window.SubwayBuilderAPI;

if (!api) {
  console.error(`${TAG} SubwayBuilderAPI not found!`);
} else {
  console.log(`${TAG} v${MOD_VERSION} | API v${api.version}`);

  // Guard against double initialization (onMapReady can fire multiple times)
  let initialized = false;

  // Initialize mod when map is ready
  api.hooks.onMapReady((_map) => {
    if (initialized) return;
    initialized = true;

    try {
      // Example: Add a floating panel with a React component
      api.ui.addFloatingPanel({
          id: 'AddMoneyPanel',
          icon: 'DollarSign',
          title: 'AnyMoney',
          defaultWidth: 300,
          defaultHeight: 520,
          render: ExamplePanel,

      });

      // const stations = window.SubwayBuilderAPI.gameState.getStations();
      // console.log('Total stations:', stations.length);

      // // Station data includes: id, name, coords, stationGroup, etc.
      // stations.forEach((station) => {
      //     console.log(`${station.name} at [${station.coords}]`);
      // });

      // const routes = window.SubwayBuilderAPI.gameState.getRoutes();
      // routes.forEach((route) => {
      //     // Try multiple ways to get station count
      //     let stationCount = route.stations?.length ?? 0;
          
      //     // If route.stations is not available, try counting stations that reference this route
      //     if (stationCount === 0) {
      //         stationCount = stations.filter(station => 
      //             station.routeIds?.includes(route.id)
      //         ).length;
      //     }
          
      //     console.log(`Route ${route.bullet || route.name || route.id}: ${stationCount} stations`);
      // });
      // api.modifyConstants({
      //   CONSTRUCTION_COSTS: {
      //     "TUNNEL": {
      //       "SINGLE_MULTIPLIER": 0.75,
      //       "QUAD_MULTIPLIER": 1.5
      //     },
      //     "STATION": {
      //       "SINGLE_MULTIPLIER": 0.75,
      //       "QUAD_MULTIPLIER": 1.5
      //     },
      //     "ELEVATION_MULTIPLIERS": {
      //       "DEEP_BORE": 4.5,
      //       "STANDARD_TUNNEL": 2.0,
      //       "CUT_AND_COVER": 1.0,
      //       "AT_GRADE": 0.3,
      //       "ELEVATED": 0.8
      //     },
      //     "WATER_MULTIPLIERS": {
      //       "DEEP_BORE": 1.44444,
      //       "STANDARD_TUNNEL": 1.5,
      //       "CUT_AND_COVER": 3.0,
      //       "AT_GRADE": 10.0,
      //       "ELEVATED": 2.5
      //     },
      //     "ELEVATION_THRESHOLDS": {
      //       "DEEP_BORE": -100,
      //       "STANDARD_TUNNEL": -24,
      //       "CUT_AND_COVER": -10,
      //       "AT_GRADE": -3,
      //       "ELEVATED": 4.5
      //     }
      //   }
      // });
      

      console.log(`${TAG} Initialized successfully.`);
    } catch (err) {
      console.error(`${TAG} Failed to initialize:`, err);
      api.ui.showNotification(`${MOD_ID} failed to load. Check console for details.`, 'error');
    }
  });
}
