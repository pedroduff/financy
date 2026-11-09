export const schema = `
  enum TransactionType { INCOME EXPENSE }
  type User { id: ID!, name: String!, email: String!, avatarUrl: String, avatarVersion: Int! }
  type Category { id: ID!, name: String!, description: String!, icon: String!, color: String! }
  type Transaction { id: ID!, categoryId: ID!, description: String!, amountInCents: String!, type: TransactionType!, date: String! }
  type Deleted { id: ID! }
  type TransactionPage { items: [Transaction!]!, totalCount: Int!, page: Int!, pageSize: Int! }
  type CategorySummary { categoryId: ID!, transactionCount: Int!, incomeInCents: String!, expenseInCents: String! }
  type CategoryOverview { categoryCount: Int!, transactionCount: Int!, categorySummaries: [CategorySummary!]! }
  type Dashboard { incomeInCents: String!, expenseInCents: String!, balanceInCents: String!, transactionCount: Int!, recentTransactions: [Transaction!]!, categorySummaries: [CategorySummary!]! }
  input SignUpInput { name: String!, email: String!, password: String! }
  input SignInInput { email: String!, password: String!, rememberMe: Boolean = false }
  input CategoryInput { name: String!, description: String! = "", icon: String!, color: String! }
  input TransactionInput { categoryId: ID!, description: String!, amountInCents: String!, type: TransactionType!, date: String! }
  input TransactionFilters { page: Int = 1, pageSize: Int = 10, search: String, type: TransactionType, categoryId: ID, startDate: String, endDate: String }
  type Query {
    health: String!
    me: User
    categories: [Category!]!
    categoryOverview: CategoryOverview!
    transactions(filters: TransactionFilters): TransactionPage!
    dashboard(startDate: String!, endDate: String!): Dashboard!
  }
  type Mutation {
    signUp(input: SignUpInput!): User!
    signIn(input: SignInInput!): User!
    signOut: Boolean!
    updateProfile(name: String!): User!
    removeAvatar(expectedVersion: Int!): User!
    changePassword(currentPassword: String!, newPassword: String!): Boolean!
    requestPasswordReset(email: String!): Boolean!
    resetPassword(token: String!, newPassword: String!): Boolean!
    createCategory(input: CategoryInput!): Category!
    updateCategory(id: ID!, input: CategoryInput!): Category!
    deleteCategory(id: ID!): Deleted!
    createTransaction(input: TransactionInput!): Transaction!
    updateTransaction(id: ID!, input: TransactionInput!): Transaction!
    deleteTransaction(id: ID!): Deleted!
  }
`;
