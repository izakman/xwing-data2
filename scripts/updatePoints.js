const fs = require('fs');
const jsonfile = require('jsonfile');
const axios = require('axios');
const _ = require('lodash');

const dataRoot = __dirname + '/../data';

const repoData = { upgrades: {}, factions: {} };


// Parse Upgrades
const upgradeFiles = fs.readdirSync(`${dataRoot}/upgrades`);
upgradeFiles.forEach(file => {
  const upgsData = jsonfile.readFileSync(`${dataRoot}/upgrades/${file}`);
  
  repoData.upgrades[file] = upgsData;
});

// Parse Pilots
const factions = fs.readdirSync(`${dataRoot}/pilots`);
factions.forEach(faction => {
  const ships = fs.readdirSync(`${dataRoot}/pilots/${faction}`);
  
  repoData.factions[faction] = {};
  
  ships.forEach(file => {
    const shipData = jsonfile.readFileSync(`${dataRoot}/pilots/${faction}/${file}`);
    
    repoData.factions[faction][file] = shipData;
  });
});


function getPointsChanges(apiCardData) {
  const changes = { upgrades: {}, factions: {} };
  
  _.forOwn(repoData.upgrades, function(upgrades, upgFile) {
    const changed = [];
    
    upgrades.forEach(function(upg) {
      const ffgID = upg.sides[0].ffg;
      
      if (ffgID) {
        const apiData = _.find(apiCardData, { id: ffgID });
        
        if (apiData) {
          const apiCost = parseInt(apiData.cost, 10);
          if (!isNaN(apiCost) && upg.cost.value !== apiCost) {
            changed.push({ xws: upg.xws, name: upg.name, old: upg.cost.value, new: apiCost });
          }
        }
      }
    })
    
    if (changed.length) {
      changes.upgrades[upgFile] = changed;
    }
  });
  
  _.forOwn(repoData.factions, function(ships, faction) {
    const changedFaction = {};
    
    _.forOwn(ships, function(ship, shipFile) {
      const changedPilots = [];
      
      ship.pilots.forEach(function(pilot) {
        const ffgID = pilot.ffg;
        
        if (ffgID) {
          const apiData = _.find(apiCardData, { id: ffgID });
          
          if (apiData) {
            const apiCost = parseInt(apiData.cost, 10);
            if (pilot.cost !== apiCost) {
              changedPilots.push({ xws: pilot.xws, name: pilot.name, old: pilot.cost, new: apiCost });
            }
          }
        }
      })
      
      if (changedPilots.length) {
        changedFaction[shipFile] = changedPilots;
      }
    });
    
    if (!_.isEmpty(changedFaction)) {
      changes.factions[faction] = changedFaction;
    }
  });
  
  return changes;
}


function logChanges(changes) {
  console.log('\nUpgrades')
  console.log('========')
  
  if (_.isEmpty(changes.upgrades)) {
    console.log('No changes found')
  } else {
    _.forOwn(changes.upgrades, function (changed, upgFile) {
      console.log(upgFile)
      
      changed.forEach(function(upg) {
        console.log('    ' + upg.name, '(' + upg.xws + '):', upg.old, '=>', upg.new)
      });
    });
  }
  
  console.log('\nPilots')
  console.log('========')
  
  if (_.isEmpty(changes.factions)) {
    console.log('No changes found')
  } else {
    _.forOwn(changes.factions, function (faction, factionDir) {
      _.forOwn(faction, function (changed, shipFile) {
        console.log(factionDir + '/' + shipFile)
        
        changed.forEach(function(pilot) {
          console.log('    ' + pilot.name, '(' + pilot.xws + '):', pilot.old, '=>', pilot.new)
        });
      });
    });
  }
}

axios.get('https://squadbuilder.fantasyflightgames.com/api/cards/')
  .then(function (response) {
    if (response.data.cards) {
      logChanges(getPointsChanges(response.data.cards));
    }
  })
  .catch(function (error) {
    console.log(error);
  })
