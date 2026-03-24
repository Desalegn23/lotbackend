import { Request, Response } from "express";
export declare class AdminController {
    private static mapAgentResponse;
    static listAgents(req: Request, res: Response): Promise<void>;
    static getAgentById(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static createAgent(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static updateAgent(req: Request, res: Response): Promise<void>;
    static deactivateAgent(req: Request, res: Response): Promise<void>;
    static activateAgent(req: Request, res: Response): Promise<void>;
    static resetAgentPassword(req: Request, res: Response): Promise<void>;
    static deleteAgent(req: Request, res: Response): Promise<void>;
    static listLotteries(req: Request, res: Response): Promise<void>;
    static getLotteryById(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static getLotteryTickets(req: Request, res: Response): Promise<void>;
    static getLotteryWinners(req: Request, res: Response): Promise<void>;
    static listTickets(req: Request, res: Response): Promise<void>;
    static listWinners(req: Request, res: Response): Promise<void>;
    static monitorSystem(req: Request, res: Response): Promise<void>;
    static getDashboardActivity(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=adminController.d.ts.map