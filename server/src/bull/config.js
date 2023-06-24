/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
const host = process.env.REDIS_HOST || "localhost";
const port = process.env.REDIS_PORT || 6379;
const password = process.env.REDIS_PASSWORD || "";

export const redisOptions = { host, port, password };

export const queueName = "rechargeQueue";
