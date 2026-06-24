import { Request, Response, NextFunction } from 'express'
import { parseUuid } from '@utils/parseUuid'
import * as StorageService from './storage.service'
import {
  ListCabinetsRequest, GetCabinetRequest, CreateCabinetRequest, UpdateCabinetRequest, DeleteCabinetRequest,
  ListShelvesRequest, GetShelfRequest, CreateShelfRequest, UpdateShelfRequest, DeleteShelfRequest,
  ListBinsRequest, GetBinRequest, CreateBinRequest, UpdateBinRequest, DeleteBinRequest,
} from './storage.interface'
import { sendSuccess, sendCreated, sendPaginated } from '@utils/responseHelper'
import { MESSAGE_CODES } from '@constants/messageCodes'

// ── Cabinets ──────────────────────────────────────────────

export const getCabinets = async (req: ListCabinetsRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { data, meta } = await StorageService.getCabinets(req.user!.pharmacyId!, req.query as any)
    sendPaginated(res, MESSAGE_CODES.STORAGE_CABINETS_FETCHED, data, meta)
  } catch (err) { next(err) }
}

export const getCabinet = async (req: GetCabinetRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const cabinet = await StorageService.getCabinetByUuid(parseUuid(req.params.cabinet_uuid), req.user!.pharmacyId!)
    sendSuccess(res, MESSAGE_CODES.STORAGE_CABINET_FETCHED, cabinet)
  } catch (err) { next(err) }
}

export const createCabinet = async (req: CreateCabinetRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const cabinet = await StorageService.createCabinet(req.body, req.user!.pharmacyId!, req.user!.id)
    sendCreated(res, MESSAGE_CODES.STORAGE_CABINET_CREATED, cabinet)
  } catch (err) { next(err) }
}

export const updateCabinet = async (req: UpdateCabinetRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const cabinet = await StorageService.updateCabinet(parseUuid(req.params.cabinet_uuid), req.body, req.user!.pharmacyId!, req.user!.id)
    sendSuccess(res, MESSAGE_CODES.STORAGE_CABINET_UPDATED, cabinet)
  } catch (err) { next(err) }
}

export const deleteCabinet = async (req: DeleteCabinetRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await StorageService.deleteCabinet(parseUuid(req.params.cabinet_uuid), req.user!.pharmacyId!, req.user!.id)
    sendSuccess(res, MESSAGE_CODES.STORAGE_CABINET_DELETED, null)
  } catch (err) { next(err) }
}

export const getCabinetsDropdown = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await StorageService.getCabinetsDropdown(req.user!.pharmacyId!, req.query.search as string | undefined)
    sendSuccess(res, MESSAGE_CODES.STORAGE_CABINETS_FETCHED, data)
  } catch (err) { next(err) }
}

// ── Shelves ───────────────────────────────────────────────

export const getShelves = async (req: ListShelvesRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { data, meta } = await StorageService.getShelves(parseUuid(req.params.cabinet_uuid), req.user!.pharmacyId!, req.query as any)
    sendPaginated(res, MESSAGE_CODES.STORAGE_SHELVES_FETCHED, data, meta)
  } catch (err) { next(err) }
}

export const getShelf = async (req: GetShelfRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const shelf = await StorageService.getShelfByUuid(parseUuid(req.params.shelf_uuid), req.user!.pharmacyId!)
    sendSuccess(res, MESSAGE_CODES.STORAGE_SHELF_FETCHED, shelf)
  } catch (err) { next(err) }
}

export const createShelf = async (req: CreateShelfRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const shelf = await StorageService.createShelf(parseUuid(req.params.cabinet_uuid), req.body, req.user!.pharmacyId!, req.user!.id)
    sendCreated(res, MESSAGE_CODES.STORAGE_SHELF_CREATED, shelf)
  } catch (err) { next(err) }
}

export const updateShelf = async (req: UpdateShelfRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const shelf = await StorageService.updateShelf(parseUuid(req.params.shelf_uuid), req.body, req.user!.pharmacyId!, req.user!.id)
    sendSuccess(res, MESSAGE_CODES.STORAGE_SHELF_UPDATED, shelf)
  } catch (err) { next(err) }
}

export const deleteShelf = async (req: DeleteShelfRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await StorageService.deleteShelf(parseUuid(req.params.shelf_uuid), req.user!.pharmacyId!, req.user!.id)
    sendSuccess(res, MESSAGE_CODES.STORAGE_SHELF_DELETED, null)
  } catch (err) { next(err) }
}

export const getShelvesDropdown = async (req: ListShelvesRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await StorageService.getShelvesDropdown(parseUuid(req.params.cabinet_uuid), req.user!.pharmacyId!, req.query.search)
    sendSuccess(res, MESSAGE_CODES.STORAGE_SHELVES_FETCHED, data)
  } catch (err) { next(err) }
}

// ── Bins ──────────────────────────────────────────────────

export const getBins = async (req: ListBinsRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { data, meta } = await StorageService.getBins(parseUuid(req.params.shelf_uuid), req.user!.pharmacyId!, req.query as any)
    sendPaginated(res, MESSAGE_CODES.STORAGE_BINS_FETCHED, data, meta)
  } catch (err) { next(err) }
}

export const getBin = async (req: GetBinRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const bin = await StorageService.getBinByUuid(parseUuid(req.params.bin_uuid), req.user!.pharmacyId!)
    sendSuccess(res, MESSAGE_CODES.STORAGE_BIN_FETCHED, bin)
  } catch (err) { next(err) }
}

export const createBin = async (req: CreateBinRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const bin = await StorageService.createBin(parseUuid(req.params.shelf_uuid), req.body, req.user!.pharmacyId!, req.user!.id)
    sendCreated(res, MESSAGE_CODES.STORAGE_BIN_CREATED, bin)
  } catch (err) { next(err) }
}

export const updateBin = async (req: UpdateBinRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const bin = await StorageService.updateBin(parseUuid(req.params.bin_uuid), req.body, req.user!.pharmacyId!, req.user!.id)
    sendSuccess(res, MESSAGE_CODES.STORAGE_BIN_UPDATED, bin)
  } catch (err) { next(err) }
}

export const deleteBin = async (req: DeleteBinRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await StorageService.deleteBin(parseUuid(req.params.bin_uuid), req.user!.pharmacyId!, req.user!.id)
    sendSuccess(res, MESSAGE_CODES.STORAGE_BIN_DELETED, null)
  } catch (err) { next(err) }
}

export const getBinsDropdown = async (req: ListBinsRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await StorageService.getBinsDropdown(parseUuid(req.params.shelf_uuid), req.user!.pharmacyId!, req.query.search)
    sendSuccess(res, MESSAGE_CODES.STORAGE_BINS_FETCHED, data)
  } catch (err) { next(err) }
}
