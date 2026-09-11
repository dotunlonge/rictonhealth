import {
  getSubscriptionCheckoutUrl,
  mapProviderDetail,
  mapProviderSummary,
  mapSubscriptionPlan,
  unwrapSubscriptionHistory,
} from '../apps/web/src/lib/api-contract-mappers';

describe('web API contract mappers', () => {
  const provider = {
    id: 'profile-1',
    userId: 'user-1',
    firstName: 'Ada',
    lastName: 'Okafor',
    title: 'Dr.',
    specialty: 'Cardiology',
    rating: '4.75',
    yearsExperience: 12,
    bio: 'Consultant cardiologist',
    avatarUrl: 'https://example.test/ada.png',
    isVerified: true,
    user: { email: 'ada@example.test', status: 'ACTIVE' },
  };

  it('maps the flat provider-profile response and routes by userId', () => {
    expect(mapProviderSummary(provider)).toEqual({
      id: 'user-1',
      profileId: 'profile-1',
      name: 'Dr. Ada Okafor',
      specialty: 'Cardiology',
      rating: 4.75,
      yearsExperience: 12,
      avatarUrl: 'https://example.test/ada.png',
      isVerified: true,
    });
  });

  it('does not invent profile fields the backend did not return', () => {
    const detail = mapProviderDetail(provider);
    expect(detail).toMatchObject({
      id: 'user-1',
      profileId: 'profile-1',
      bio: 'Consultant cardiologist',
      status: 'ACTIVE',
      email: 'ada@example.test',
    });
    expect(detail).not.toHaveProperty('reviews');
    expect(detail).not.toHaveProperty('morningShift');
  });

  it('maps billingPeriod and unwraps the backend history envelope', () => {
    expect(
      mapSubscriptionPlan({
        id: 'premium',
        name: 'Premium',
        price: 5000,
        currency: 'NGN',
        billingPeriod: 'monthly',
        features: ['Telemedicine'],
      })
    ).toMatchObject({ interval: 'monthly', features: ['Telemedicine'] });

    const history = [{ id: 'sub-1', plan: 'PREMIUM' }];
    expect(unwrapSubscriptionHistory({ subscriptions: history, total: 1 })).toBe(history);
  });

  it('uses the backend paymentUrl field for checkout', () => {
    expect(getSubscriptionCheckoutUrl({ paymentUrl: 'https://checkout.test/session' })).toBe(
      'https://checkout.test/session'
    );
    expect(getSubscriptionCheckoutUrl({ url: 'https://wrong.test' })).toBeNull();
  });
});
