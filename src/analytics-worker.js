import {deriveAnalytics,comparePeriods} from './institutional-analytics.js?v=20261012-analytics1';
self.onmessage=({data:{state,actor,options,previous}})=>{try{const report=deriveAnalytics(state,actor,options);self.postMessage({report,comparison:previous?comparePeriods(report,deriveAnalytics(state,actor,previous)):null});}catch(e){self.postMessage({error:e.message});}};
