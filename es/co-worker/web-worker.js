import blueDefer from '../util/defer';
import Logger from 'mtproto-logger';
var log = Logger`web-worker`;

export default class Webworker {
  static of() {
    return new Webworker();
  }

  constructor() {
    this.taskCount = 0;
    this.awaiting = {};

    this.initWorker();
    this.worker.postMessage('b');
  }

  getNextID() {
    return this.taskCount++;
  }

  run(taskType, data) {
    var task = {
      task: taskType,
      taskID: this.getNextID(),
      data
    };
    return this.addTaskAwait(task);
  }

  addTaskAwait(task) {
    this.awaiting[task.taskID] = blueDefer();
    this.worker.postMessage(task);
    return this.awaiting[task.taskID].promise;
  }

  initWorker() {
    this.worker = getWorker();

    this.worker.onmessage = ({ data }) => {
      if (typeof data === 'string') {
        data === 'ready' ? log`init`('CW ready') : log`init`('Unknown worker message', data);
      } else if (!isCryptoTask(data)) {
        log`init`('Not crypto task', data);
      } else {
        this.resolveTask(data.taskID, data.result);
      }
    };
    this.worker.onerror = err => {
      log`error`(err);
    };
  }

  resolveTask(taskID, result) {
    var defer = this.awaiting[taskID];
    if (!defer) {
      log`resolve task, error`(`No stored task ${taskID} found`);
      return;
    }
    delete this.awaiting[taskID];
    defer.resolve(result);
  }
}

function isCryptoTask(obj) {
  return typeof obj === 'object' && typeof obj.taskID === 'number';
}

function getWorker() {
  var WorkerInstance = void 0;
  try {
    //$FlowIssue
    WorkerInstance = require('worker-loader?inline!./worker.js');
  } catch (err) {
    WorkerInstance = require('./worker.js');
  }

  //$FlowIssue
  var worker = new WorkerInstance();
  return worker;
}
//# sourceMappingURL=web-worker.js.map