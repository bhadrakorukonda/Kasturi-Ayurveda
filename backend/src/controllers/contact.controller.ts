import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import Contact, { IContact } from '../models/Contact.model';
import { sendContactConfirmation } from '../utils/email.util';

// @desc    Create contact message
// @route   POST /api/contact
// @access  Public
export const createContact = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        status: 'error',
        errors: errors.array(),
      });
      return;
    }

    const contact = await Contact.create(req.body);

    // Send confirmation email
    try {
      await sendContactConfirmation(contact as unknown as IContact);
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
    }

    res.status(201).json({
      status: 'success',
      message: 'Message sent successfully. We will get back to you soon!',
      data: contact,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all contact messages
// @route   GET /api/contact
// @access  Private (Admin/Staff)
export const getAllContacts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    const query: any = {};
    if (status) query.status = status;

    const contacts = await Contact.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Contact.countDocuments(query);

    res.status(200).json({
      status: 'success',
      data: contacts,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update contact message status
// @route   PUT /api/contact/:id
// @access  Private (Admin/Staff)
export const updateContactStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const contact = await Contact.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true, runValidators: true }
    );

    if (!contact) {
      res.status(404).json({
        status: 'error',
        message: 'Contact message not found',
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      message: 'Status updated successfully',
      data: contact,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete contact message
// @route   DELETE /api/contact/:id
// @access  Private (Admin)
export const deleteContact = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const contact = await Contact.findByIdAndDelete(req.params.id);

    if (!contact) {
      res.status(404).json({
        status: 'error',
        message: 'Contact message not found',
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      message: 'Contact message deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
