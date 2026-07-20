import { Request, Response, NextFunction } from 'express';
import { prisma } from '@ricton/db';
import { JwtPayload } from '@ricton/auth-middleware';
import { successResponse, NotFoundError, ValidationError } from '@ricton/shared';

/**
 * List all addresses for the current user
 */
export const getAddresses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    const userId = userPayload.userId;

    const addresses = await prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    res.status(200).json(successResponse({ addresses }));
  } catch (error) {
    next(error);
  }
};

/**
 * Get a specific address by ID (must belong to current user)
 */
export const getAddressById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    const userId = userPayload.userId;
    const { id } = req.params;

    const address = await prisma.address.findFirst({
      where: { id, userId },
    });

    if (!address) {
      throw new NotFoundError('Address not found');
    }

    res.status(200).json(successResponse(address));
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new address for the current user
 */
export const createAddress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    const userId = userPayload.userId;
    const { addressLine1, addressLine2, city, state, country, postalCode, latitude, longitude, isDefault } = req.body;

    // Validate required fields
    if (!addressLine1 || !city || !state) {
      throw new ValidationError('Address line 1, city, and state are required');
    }

    // If setting as default, unset other defaults first
    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const address = await prisma.address.create({
      data: {
        userId,
        addressLine1,
        addressLine2: addressLine2 || null,
        city,
        state,
        country: country || 'Nigeria',
        postalCode: postalCode || null,
        latitude: latitude ? Number(latitude) : null,
        longitude: longitude ? Number(longitude) : null,
        isDefault: isDefault || false,
      },
    });

    res.status(201).json(successResponse(address));
  } catch (error) {
    next(error);
  }
};

/**
 * Update an existing address (must belong to current user)
 */
export const updateAddress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    const userId = userPayload.userId;
    const { id } = req.params;
    const { addressLine1, addressLine2, city, state, country, postalCode, latitude, longitude, isDefault } = req.body;

    // Verify ownership
    const existingAddress = await prisma.address.findFirst({
      where: { id, userId },
    });

    if (!existingAddress) {
      throw new NotFoundError('Address not found');
    }

    // If setting as default, unset other defaults first
    if (isDefault && !existingAddress.isDefault) {
      await prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const address = await prisma.address.update({
      where: { id },
      data: {
        addressLine1: addressLine1 ?? existingAddress.addressLine1,
        addressLine2: addressLine2 ?? existingAddress.addressLine2,
        city: city ?? existingAddress.city,
        state: state ?? existingAddress.state,
        country: country ?? existingAddress.country,
        postalCode: postalCode ?? existingAddress.postalCode,
        latitude: latitude !== undefined ? Number(latitude) : existingAddress.latitude,
        longitude: longitude !== undefined ? Number(longitude) : existingAddress.longitude,
        isDefault: isDefault !== undefined ? isDefault : existingAddress.isDefault,
      },
    });

    res.status(200).json(successResponse(address));
  } catch (error) {
    next(error);
  }
};

/**
 * Delete an address (must belong to current user)
 */
export const deleteAddress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    const userId = userPayload.userId;
    const { id } = req.params;

    // Verify ownership
    const address = await prisma.address.findFirst({
      where: { id, userId },
    });

    if (!address) {
      throw new NotFoundError('Address not found');
    }

    await prisma.address.delete({
      where: { id },
    });

    res.status(200).json(successResponse({ message: 'Address deleted successfully' }));
  } catch (error) {
    next(error);
  }
};

/**
 * Set an address as the default address
 */
export const setDefaultAddress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    const userId = userPayload.userId;
    const { id } = req.params;

    // Verify ownership
    const address = await prisma.address.findFirst({
      where: { id, userId },
    });

    if (!address) {
      throw new NotFoundError('Address not found');
    }

    // Unset all other defaults
    await prisma.address.updateMany({
      where: { userId, isDefault: true, id: { not: id } },
      data: { isDefault: false },
    });

    // Set this one as default
    const updatedAddress = await prisma.address.update({
      where: { id },
      data: { isDefault: true },
    });

    res.status(200).json(successResponse(updatedAddress));
  } catch (error) {
    next(error);
  }
};

/**
 * Validate an address format (basic validation, can be extended with geocoding APIs)
 */
export const validateAddress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { addressLine1, city, state, country, postalCode } = req.body;

    // Basic validation
    const errors: string[] = [];

    if (!addressLine1 || addressLine1.trim().length < 5) {
      errors.push('Address line 1 must be at least 5 characters');
    }

    if (!city || city.trim().length < 2) {
      errors.push('City is required');
    }

    if (!state || state.trim().length < 2) {
      errors.push('State is required');
    }

    if (postalCode && !/^\d{6}$/.test(postalCode)) {
      errors.push('Postal code must be 6 digits (Nigerian format)');
    }

    if (errors.length > 0) {
      throw new ValidationError(errors.join(', '));
    }

    // Return validation result
    res.status(200).json(
      successResponse({
        isValid: true,
        normalizedAddress: {
          addressLine1: addressLine1.trim(),
          city: city.trim(),
          state: state.trim(),
          country: country?.trim() || 'Nigeria',
          postalCode: postalCode?.trim() || null,
        },
      })
    );
  } catch (error) {
    next(error);
  }
};
