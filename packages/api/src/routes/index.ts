import { Application } from "express";
import AutomationHttpHandler from "./automation.http";
import Passport from "./passport.http";
import SegmentHttpHandler from "./segment.http";
import SequenceHttpHandler from "./sequence.http";
import MiddlewareRegistry from "../services/middleware.registry";

class HttpRoutes {
  constructor(app: Application) {
    MiddlewareRegistry.addMiddleware(new Passport(app));
    MiddlewareRegistry.addMiddleware(new SegmentHttpHandler(app));
    MiddlewareRegistry.addMiddleware(new SequenceHttpHandler(app));
    MiddlewareRegistry.addMiddleware(new AutomationHttpHandler(app));
  }
}

export default HttpRoutes;
