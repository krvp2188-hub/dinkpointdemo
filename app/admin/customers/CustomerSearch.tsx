'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'

type CustomerRow = {
  id: string
  name: string
  email: string
  phone: string
  created_at: string
  bookingCount: number
  totalSpent: number
}

type Props = {
  customers: CustomerRow[]
}

export default function CustomerSearch({
  customers,
}: Props) {
  const [search, setSearch] = useState('')

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) {
      return customers
    }

    return customers.filter((customer) =>
      [
        customer.name,
        customer.email,
        customer.phone,
      ]
        .join(' ')
        .toLowerCase()
        .includes(query)
    )
  }, [customers, search])

  return (
    <div>
      {/* Search */}
      <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <label
          htmlFor="customer-search"
          className="mb-2 block text-sm font-semibold text-slate-700"
        >
          Search Customers
        </label>

        <input
          id="customer-search"
          type="text"
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
          placeholder="Search by name, email, or phone..."
          className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
        />
      </div>

      {/* Results */}
      {filteredCustomers.length === 0 ? (
        <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
          <div className="text-5xl">
            🔍
          </div>

          <h2 className="mt-5 text-xl font-bold text-slate-900">
            No customers found
          </h2>

          <p className="mt-2 text-slate-600">
            Try a different name, email, or phone number.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-700">
                    Customer
                  </th>

                  <th className="px-6 py-4 text-sm font-semibold text-slate-700">
                    Email
                  </th>

                  <th className="px-6 py-4 text-sm font-semibold text-slate-700">
                    Phone
                  </th>

                  <th className="px-6 py-4 text-sm font-semibold text-slate-700">
                    Customer Since
                  </th>

                  <th className="px-6 py-4 text-sm font-semibold text-slate-700">
                    Bookings
                  </th>

                  <th className="px-6 py-4 text-sm font-semibold text-slate-700">
                    Total Spent
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id}>
					<td className="px-6 py-4">
					  <Link
						href={`/admin/customers/${customer.id}`}
						className="font-semibold text-blue-600 hover:text-blue-700"
					  >
						{customer.name}
					  </Link>
					</td>

                    <td className="px-6 py-4 text-sm text-slate-600">
                      {customer.email || '—'}
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-600">
                      {customer.phone || '—'}
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-600">
                      {new Date(
                        customer.created_at
                      ).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-600">
                      {customer.bookingCount}
                    </td>

                    <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                      ₱
                      {customer.totalSpent.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="mt-3 text-sm text-slate-500">
        Showing {filteredCustomers.length} of{' '}
        {customers.length} customers
      </p>
    </div>
  )
}