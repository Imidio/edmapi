import ratelimiter from "../config/upstash.js";

const rateLimiter = async(req, res, next) =>{
    try {
        const {success} = await ratelimiter.limit("teste");

        if(!success){
            return res.status(429).json({
                message:"Excedeu limite de tentativas, tente mais tarde."
            });
        }
    } catch (error) {
        console.log("Rate Limiter err", error);
        next(error);
        
    }
};

export default rateLimiter;