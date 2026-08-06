'use client';

import { createContext, useContext, useEffect, useState } from 'react';

const BookingMessagesContext = createContext({
  bookingId: null,
  setBookingId: () => {},
});

export function BookingMessagesProvider({ children }) {
  const [bookingId, setBookingId] = useState(null);
  return (
    <BookingMessagesContext.Provider value={{ bookingId, setBookingId }}>
      {children}
    </BookingMessagesContext.Provider>
  );
}

/** Register the open booking so the header Messages button opens that thread. */
export function useRegisterBookingMessages(bookingId) {
  const { setBookingId } = useContext(BookingMessagesContext);
  useEffect(() => {
    if (!bookingId) return undefined;
    setBookingId(bookingId);
    return () => setBookingId(null);
  }, [bookingId, setBookingId]);
}

export function useBookingMessagesTarget() {
  return useContext(BookingMessagesContext);
}

export default BookingMessagesContext;
