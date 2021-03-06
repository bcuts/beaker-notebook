/*
 *  Copyright 2015 TWO SIGMA OPEN SOURCE, LLC
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

var drool = require('drool');
var humanize = require('humanize');
var chalk = require('chalk');
var webdriver = require('./node_modules/drool/node_modules/selenium-webdriver');
var config = {
  chromeOptions: 'no-sandbox'
};
//var until = require('./node_modules/drool/node_modules/selenium-webdriver/lib/webdriver/until');
var driver;
if (typeof process.env.chromeBinaryPath !== 'undefined') {
  config.chromeBinaryPath = process.env.chromeBinaryPath;
}

function instantiateDrool() {
  return drool.start(config);
}

function openNotebook() {
  driver.wait(function() {
    return driver.findElement(webdriver.By.css('.new-empty-notebook')).click()
    .then(function() {
      return true;
    })
    .thenCatch(function() {
      return false;
    });
  }, 5000)
}

function waitForElement(fn) {
  return driver.wait(function() {return fn().then(function() {return true;}).thenCatch(function() {return false;})}, 2500);
}

function openFileMenu() {
  driver.wait(function() {
    return driver.findElement(webdriver.By.css('a.dropdown-toggle')).click()
    .then(function() {
      return true;
    })
    .thenCatch(function() {
      return false;
    });
  }, 5000);
}

function closeNotebook() {
  openFileMenu();
  driver.findElement(webdriver.By.css('#close-menuitem')).click();
  waitForElement(function() {
    return driver.findElement(webdriver.By.css('.btn.no')).click();
  });

  waitForElement(function() {
    return driver.findElement(webdriver.By.css('bk-control-panel')).isDisplayed();
  });
}

function addCell() {
  waitForElement(function() {
    return driver.findElement(webdriver.By.css('button.insert-cell')).click();
  });
}

function addAndRemoveCell() {
  addCell();
  driver.findElement(webdriver.By.css('.delete-cell')).click();
}

function evaluateCell() {
  waitForElement(function() {return driver.findElement(webdriver.By.css('.evaluate-script')).click();});
}

function enterCode(code) {
  return waitForElement(function () {
    return driver.findElement(webdriver.By.css('.CodeMirror textarea')).sendKeys(code ? code : '1 + 1' );
  });
}

function deleteCellOutput() {
  waitForElement(function() {
    return driver.findElement(webdriver.By.css('bk-code-cell-output .cell-dropdown')).click();
  });

  waitForElement(function() {
    return driver.findElement(webdriver.By.xpath('/html/body/ng-view/bk-main-app/div/div[1]/div/bk-notebook/ul/li[3]/a')).click();
  });
}

function evaluateAndRemoveOutputCell() {
  evaluateCell();
  waitForCellOutput();
  deleteCellOutput();
}


var notebookMenu = function () {
  return driver.findElement(webdriver.By.css('.notebook-menu'));
};
var languageManagerMenuItem = function () {
  return driver.findElement(webdriver.By.css('.language-manager-menuitem'));
};
var languageManagerCloseButton = function () {
  return driver.findElement(webdriver.By.css('.language-manager-close-button'));
};
var languageManagerButton = function(language) {
  return driver.findElement(webdriver.By.css('.plugin-manager .' + language));
};

var waitForPlugin = function(language){
  driver.wait(function () {
    return driver.isElementPresent(webdriver.By.css('.plugin-manager .' + language + ' .plugin-active'));
  }, 10000);
};

var waitForCellOutput = function () {
  waitForElement(function() {
    return driver.isElementPresent(webdriver.By.css('bk-output-display > div'));
  });
  return driver.wait(function () {
    return driver.isElementPresent(webdriver.By.css('.navbar-text > i'))
      .then(function(result) {
        return !result;
      })
      .thenCatch(function () {
        return false;
      });
  }, 10000);
};

function loadGroovy() {
  waitForElement(function() {
    return notebookMenu().click();
  });
  waitForElement(function() {
    return languageManagerMenuItem().click();
  });
  waitForElement(function() {
    return languageManagerButton('Groovy').click();
  });

  waitForPlugin('Groovy');

  waitForElement(function() {
    return languageManagerCloseButton().click();
  });
}

function printChange(original, current) {
  var heapChange = current.counts.jsHeapSizeUsed - original.counts.jsHeapSizeUsed;
  var nodeChange = current.counts.nodes - original.counts.nodes;
  var listenerChange = current.counts.jsEventListeners - original.counts.jsEventListeners;

  console.log('Heap Size Delta:      ' + chalk[heapChange > 0 ? 'red' : 'green'](humanize.filesize(heapChange)));
  console.log('Node Count Delta:     ' + chalk[nodeChange > 0 ? 'red' : 'green'](nodeChange));
  console.log('Event Listener Delta: ' + chalk[listenerChange > 0 ? 'red' : 'green'](listenerChange));
}

drool.flow({
  repeatCount: 20,
  setup: function () {
    driver.get('http://127.0.0.1:8801');
    openNotebook();
  },
  action: function () {
    addAndRemoveCell();
  },
  assert: function (after, initial) {
    printChange(initial, after);
  },
  exit: function () {
    closeNotebook();
    driver.quit();
  }
}, driver = instantiateDrool()).then(function () {
  drool.flow({
    repeatCount: 20,
    setup: function () {
      driver.get('http://127.0.0.1:8801');
      openNotebook();
      addCell();
      enterCode();
    },
    action: function () {
      evaluateAndRemoveOutputCell();
    },
    assert: function (after, initial) {
      printChange(initial, after);
    },
    exit: function () {
      closeNotebook();
      driver.quit();
    }
  }, driver = instantiateDrool()).then(
    function () {
      drool.flow({
        repeatCount: 20,
        setup: function () {
          driver.get('http://127.0.0.1:8801');
          openNotebook();
          loadGroovy();
          addCell();
          var code =
            "def millis = new Date().time\n" +
            "table = [[time: millis + 7 * 1, next_time:(millis + 77) * 1, temp:14.6],\n" +
            "[time: millis + 7 * 2, next_time:(millis + 88) * 2, temp:18.1],\n" +
            "[time: millis + 7 * 3, next_time:(millis + 99) * 3, temp:23.6]]\n" +
            "table";
          enterCode(code);
        },
        action: function () {
          evaluateAndRemoveOutputCell();
        },
        assert: function (after, initial) {
          printChange(initial, after);
        },
        exit: function () {
          closeNotebook();
          driver.quit();
        }
      }, driver = instantiateDrool()).then(function(){
        drool.flow({
          repeatCount: 20,
          setup: function () {
            driver.get('http://127.0.0.1:8801');
            openNotebook();
            loadGroovy();
            addCell();
            enterCode("new Plot().add(new Line(x: (0..5), y: [0, 1, 6, 5, 2, 8]))");
          },
          action: function () {
            evaluateAndRemoveOutputCell();
          },
          assert: function (after, initial) {
            printChange(initial, after);
          },
          exit: function () {
            closeNotebook();
            driver.quit();
          }
        }, driver = instantiateDrool())
      })
    }
  );
});
