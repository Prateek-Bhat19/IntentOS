"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BuyController = void 0;
const buy_service_1 = require("../services/buy.service");
const query_validation_1 = require("../validations/query.validation");
const buy_queue_1 = require("../queues/buy.queue");
class BuyController {
    static async create(req, res, next) {
        try {
            const item = await buy_service_1.BuyService.create(req.user.id, req.body);
            res.status(201).json(item);
        }
        catch (error) {
            next(error);
        }
    }
    static async list(req, res, next) {
        try {
            const query = query_validation_1.listQuerySchema.parse(req.query);
            const result = await buy_service_1.BuyService.list(req.user.id, query);
            console.log("DEBUG: BuyController.list result:", JSON.stringify(result, null, 2));
            res.json(result);
        }
        catch (err) {
            next(err);
        }
    }
    static async update(req, res, next) {
        try {
            const item = await buy_service_1.BuyService.update(req.user.id, req.params.id, req.body);
            res.json(item);
        }
        catch (err) {
            next(err);
        }
    }
    static async changeStatus(req, res, next) {
        try {
            const { status } = req.body;
            const item = await buy_service_1.BuyService.changeStatus(req.user.id, req.params.id, status);
            res.json(item);
        }
        catch (err) {
            next(err);
        }
    }
    static async remove(req, res, next) {
        try {
            await buy_service_1.BuyService.softDelete(req.user.id, req.params.id);
            res.status(204).send();
        }
        catch (err) {
            next(err);
        }
    }
    static async refreshMetadata(req, res, next) {
        try {
            const item = await buy_service_1.BuyService.findById(req.params.id);
            if (!item || item.userId !== req.user.id) {
                return res.status(404).json({ error: "Item not found" });
            }
            if (!item.link) {
                return res.status(400).json({ error: "No link to refresh metadata from" });
            }
            await (0, buy_queue_1.enqueueFetchMetadata)(item.id);
            res.json({ message: "Metadata refresh queued successfully" });
        }
        catch (err) {
            next(err);
        }
    }
}
exports.BuyController = BuyController;
