/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import {
  writeFileForAsyncBatch,
} from "./helpers.js";
/*
 * NOTE Returns false if no action is taken and true if some update occured
 *
 */
export default async function asyncBatchProcessed(topic, shop, body, { io, sockets }) {

  const mytopic = "ASYNC_BATCH_PROCESSED";
  if (topic !== mytopic) {
    _logger.notice(`Recharge webhook ${topic} received but expected ${mytopic}`, { meta: { recharge: {} } });
    return false;
  };
  const topicLower = topic.toLowerCase().replace(/_/g, "/");

  try {

    const async_batch = JSON.parse(body).async_batch;

    writeFileForAsyncBatch(async_batch, "processed");

    const entry = await _mongodb.collection("pending_batches").findOne({id: async_batch.id});
    // here's an idea: if it has failed count, then update the entry, remove the id (so it is still polled as removed)
    // and or course log as an error, and I can then refer to the entry?

    if (entry) {
      if (sockets && io && Object.hasOwnProperty.call(sockets, entry.session_id)) {
        const socket_id = sockets[entry.session_id];
        io = io.to(socket_id);
        if (io) io.emit("completed", `${entry.action} batch completed: ${entry.id}`);
      };
      await _mongodb.collection("pending_batches").deleteMany({id: async_batch.id});
    };

  } catch(err) {
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
    return false;
  };

  return true;
};


