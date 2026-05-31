import { Request, Response, NextFunction } from 'express'
import * as PurchaseOrderService from './purchase-orders.service'
import {
  createPurchaseOrderSchema,
  updatePurchaseOrderSchema,
  cancelPurchaseOrderSchema,
  purchaseOrderQuerySchema,
} from './purchase-orders.validation'
import {
  GetPurchaseOrdersRequest,
  GetPurchaseOrderRequest,
  CreatePurchaseOrderRequest,
  UpdatePurchaseOrderRequest,
  SubmitPurchaseOrderRequest,
  CancelPurchaseOrderRequest,
  DeletePurchaseOrderRequest,
} from './purchase-orders.interface'
import { ValidationException } from '@exceptions/ValidationException'
import {
  sendSuccess,
  sendCreated,
  sendPaginated,
} from '@utils/responseHelper'
import { MESSAGE_CODES } from '@constants/messageCodes'

export const getPurchaseOrders = async (
  req: GetPurchaseOrdersRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parsed = purchaseOrderQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      throw new ValidationException(
        parsed.error.flatten().fieldErrors as Record<string, any>
      )
    }

    const { data, meta } = await PurchaseOrderService.getPurchaseOrders(
      req.user!.pharmacyId!,
      parsed.data
    )

    sendPaginated(res, MESSAGE_CODES.PURCHASE_ORDERS_FETCHED, data, meta)
  } catch (err) {
    next(err)
  }
}

export const getPurchaseOrder = async (
  req: GetPurchaseOrderRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const purchaseOrder = await PurchaseOrderService.getPurchaseOrderByUuid(
      req.params.purchase_order_uuid,
      req.user!.pharmacyId!
    )

    sendSuccess(res, MESSAGE_CODES.PURCHASE_ORDER_FETCHED, purchaseOrder)
  } catch (err) {
    next(err)
  }
}

export const createPurchaseOrder = async (
  req: CreatePurchaseOrderRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parsed = createPurchaseOrderSchema.safeParse(req.body)
    if (!parsed.success) {
      throw new ValidationException(
        parsed.error.flatten().fieldErrors as Record<string, any>
      )
    }

    const purchaseOrder = await PurchaseOrderService.createPurchaseOrder(
      parsed.data,
      req.user!.pharmacyId!,
      req.user!.id
    )

    sendCreated(res, MESSAGE_CODES.PURCHASE_ORDER_CREATED, purchaseOrder)
  } catch (err) {
    next(err)
  }
}

export const updatePurchaseOrder = async (
  req: UpdatePurchaseOrderRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parsed = updatePurchaseOrderSchema.safeParse(req.body)
    if (!parsed.success) {
      throw new ValidationException(
        parsed.error.flatten().fieldErrors as Record<string, any>
      )
    }

    const purchaseOrder = await PurchaseOrderService.updatePurchaseOrder(
      req.params.purchase_order_uuid,
      parsed.data,
      req.user!.pharmacyId!,
      req.user!.id
    )

    sendSuccess(res, MESSAGE_CODES.PURCHASE_ORDER_UPDATED, purchaseOrder)
  } catch (err) {
    next(err)
  }
}

export const submitPurchaseOrder = async (
  req: SubmitPurchaseOrderRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const purchaseOrder = await PurchaseOrderService.submitPurchaseOrder(
      req.params.purchase_order_uuid,
      req.user!.pharmacyId!,
      req.user!.id
    )

    sendSuccess(res, MESSAGE_CODES.PURCHASE_ORDER_SUBMITTED, purchaseOrder)
  } catch (err) {
    next(err)
  }
}

export const cancelPurchaseOrder = async (
  req: CancelPurchaseOrderRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parsed = cancelPurchaseOrderSchema.safeParse(req.body)
    if (!parsed.success) {
      throw new ValidationException(
        parsed.error.flatten().fieldErrors as Record<string, any>
      )
    }

    const purchaseOrder = await PurchaseOrderService.cancelPurchaseOrder(
      req.params.purchase_order_uuid,
      parsed.data,
      req.user!.pharmacyId!,
      req.user!.id
    )

    sendSuccess(res, MESSAGE_CODES.PURCHASE_ORDER_CANCELLED, purchaseOrder)
  } catch (err) {
    next(err)
  }
}

export const deletePurchaseOrder = async (
  req: DeletePurchaseOrderRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await PurchaseOrderService.deletePurchaseOrder(
      req.params.purchase_order_uuid,
      req.user!.pharmacyId!,
      req.user!.id
    )

    sendSuccess(res, MESSAGE_CODES.PURCHASE_ORDER_DELETED, null)
  } catch (err) {
    next(err)
  }
}

export const getPurchaseOrdersDropdown = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = await PurchaseOrderService.getPurchaseOrdersDropdown(
      req.user!.pharmacyId!,
      req.query.search as string | undefined
    )
    sendSuccess(res, MESSAGE_CODES.PURCHASE_ORDERS_FETCHED, data)
  } catch (err) {
    next(err)
  }
}