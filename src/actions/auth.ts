'use server';

import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { createSession } from '@/lib/session';
import { createAdminNotification, createStaffNotification } from '@/lib/notifications';

export async function loginUser(email: string, password: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { itr: true },
    });

    if (!user || !user.password) {
      return { success: false, error: 'Invalid email or password. Please try again.' };
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return { success: false, error: 'Invalid email or password. Please try again.' };
    }

    // Create session
    await createSession(user.id, user.role, user.name, user.email || '');

    // Determine redirect
    let redirectPath = '/dashboard';
    switch (user.role) {
      case 'ADMIN':
        redirectPath = '/dashboard/admin';
        break;
      case 'STAFF':
        redirectPath = '/dashboard/staff';
        break;
      case 'DOCTOR':
        redirectPath = '/dashboard/doctor';
        break;
      case 'PATIENT':
        redirectPath = user.itr?.isCompleted ? '/dashboard/patient' : '/dashboard/patient/itr';
        break;
    }

    return { success: true, redirect: redirectPath };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: 'An unexpected error occurred. Please try again later.' };
  }
}

export async function registerPatient(formData: any) {
  try {
    // --- Server-side reCAPTCHA verification ---
    const captchaToken = formData.captchaToken;
    if (!captchaToken) {
      return { success: false, error: 'CAPTCHA verification is required.' };
    }

    const recaptchaSecretKey = process.env.RECAPTCHA_SECRET_KEY;
    if (!recaptchaSecretKey) {
      console.error('RECAPTCHA_SECRET_KEY is not set in environment variables.');
      return { success: false, error: 'Server configuration error. Please contact support.' };
    }

    const recaptchaVerifyRes = await fetch(
      `https://www.google.com/recaptcha/api/siteverify`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `secret=${recaptchaSecretKey}&response=${captchaToken}`,
      }
    );
    const recaptchaData = await recaptchaVerifyRes.json();

    if (!recaptchaData.success) {
      return { success: false, error: 'CAPTCHA verification failed. Please try again.' };
    }
    // ------------------------------------------

    const email = formData.email.toLowerCase();
    
    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return { success: false, error: 'This email is already registered. Please use a different email.' };
    }

    // Hash password
    const passwordHash = await bcrypt.hash(formData.password, 10);

    // Save new user
    const newUser = await prisma.user.create({
      data: {
        role: 'PATIENT',
        email: email,
        password: passwordHash,
        name: `${formData.firstName} ${formData.lastName}`,
        firstName: formData.firstName,
        lastName: formData.lastName,
        middleName: formData.middleName,
        suffix: formData.suffix,
        phone: formData.phone,
        address: formData.address,
        birthday: formData.birthday ? new Date(formData.birthday) : null,
        maritalStatus: formData.maritalStatus,
        gender: formData.sex,
      },
    });

    // Create a blank ITR
    await prisma.iTR.create({
      data: {
        patientId: newUser.id,
        isCompleted: false,
      }
    });

    // Create session
    await createSession(newUser.id, newUser.role, newUser.name, newUser.email || '');

    // Notify Admins only
    await createAdminNotification(`New patient registered: ${newUser.name}`);

    return { success: true, redirect: '/dashboard/patient/itr' };

  } catch (error) {
    console.error('Registration error:', error);
    return { success: false, error: 'Failed to register account. Please try again later.' };
  }
}

export async function logoutUser() {
  await import('@/lib/session').then(m => m.deleteSession());
  return { success: true };
}
