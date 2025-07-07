import React, { createContext, useContext, useReducer, useEffect } from 'react'
import { authAPI, handleAPIError } from '../services/api'
import { toast } from 'react-toastify'
import cryptoUtils from '../utils/crypto'

// Initial state
const initialState = {
  user: null,
  token: null,
  loading: true,
  error: null,
  isAuthenticated: false,
}

// Action types
const AuthActionTypes = {
  LOGIN_START: 'LOGIN_START',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGOUT: 'LOGOUT',
  REGISTER_START: 'REGISTER_START',
  REGISTER_SUCCESS: 'REGISTER_SUCCESS',
  REGISTER_FAILURE: 'REGISTER_FAILURE',
  LOAD_USER: 'LOAD_USER',
  CLEAR_ERROR: 'CLEAR_ERROR',
  SET_LOADING: 'SET_LOADING',
}

// Reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case AuthActionTypes.LOGIN_START:
    case AuthActionTypes.REGISTER_START:
      return {
        ...state,
        loading: true,
        error: null,
      }

    case AuthActionTypes.LOGIN_SUCCESS:
      return {
        ...state,
        loading: false,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        error: null,
      }

    case AuthActionTypes.REGISTER_SUCCESS:
      return {
        ...state,
        loading: false,
        error: null,
      }

    case AuthActionTypes.LOGIN_FAILURE:
    case AuthActionTypes.REGISTER_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload,
        user: null,
        token: null,
        isAuthenticated: false,
      }

    case AuthActionTypes.LOGOUT:
      return {
        ...initialState,
        loading: false,
      }

    case AuthActionTypes.LOAD_USER:
      return {
        ...state,
        loading: false,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
      }

    case AuthActionTypes.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      }

    case AuthActionTypes.SET_LOADING:
      return {
        ...state,
        loading: action.payload,
      }

    default:
      return state
  }
}

// Create context
const AuthContext = createContext()

// Provider component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState)

  // Load user from localStorage on mount
  useEffect(() => {
    const loadStoredUser = () => {
      try {
        const token = localStorage.getItem('authToken')
        const user = localStorage.getItem('user')

        if (token && user) {
          dispatch({
            type: AuthActionTypes.LOAD_USER,
            payload: {
              token,
              user: JSON.parse(user),
            },
          })
        } else {
          dispatch({ type: AuthActionTypes.SET_LOADING, payload: false })
        }
      } catch (error) {
        console.error('Error loading stored user:', error)
        localStorage.removeItem('authToken')
        localStorage.removeItem('user')
        dispatch({ type: AuthActionTypes.SET_LOADING, payload: false })
      }
    }

    loadStoredUser()
  }, [])

  // Register function
  const register = async (userData) => {
    try {
      dispatch({ type: AuthActionTypes.REGISTER_START })

      // Generate key pair for the user
      const keyPair = cryptoUtils.generateKeyPair()

      // Add public key to registration data
      const registrationData = {
        ...userData,
        publicKey: keyPair.publicKey,
      }

      const response = await authAPI.register(registrationData)

      // Store private key securely
      await cryptoUtils.storePrivateKey(
        keyPair.privateKey,
        userData.password,
        userData.username
      )

      dispatch({ type: AuthActionTypes.REGISTER_SUCCESS })

      toast.success('Registration successful! Please login with your credentials.')

      return {
        success: true,
        data: response.data,
        certificate: response.data.certificate,
      }
    } catch (error) {
      const errorInfo = handleAPIError(error)
      dispatch({
        type: AuthActionTypes.REGISTER_FAILURE,
        payload: errorInfo.message,
      })

      toast.error(errorInfo.message)

      return {
        success: false,
        error: errorInfo,
      }
    }
  }

  // Login function
  const login = async (credentials) => {
    try {
      dispatch({ type: AuthActionTypes.LOGIN_START })

      const response = await authAPI.login(credentials)

      // Store token and user data
      localStorage.setItem('authToken', response.data.token)
      localStorage.setItem('user', JSON.stringify(response.data.user))

      // Check if private key exists locally
      const hasPrivateKey = await cryptoUtils.hasPrivateKey(credentials.username)

      if (!hasPrivateKey) {
        toast.warning(
          'Private key not found locally. Some features may not work properly. Please ensure you are using the same device where you registered.'
        )
      }

      dispatch({
        type: AuthActionTypes.LOGIN_SUCCESS,
        payload: {
          user: response.data.user,
          token: response.data.token,
        },
      })

      toast.success('Login successful!')

      return {
        success: true,
        data: response.data,
      }
    } catch (error) {
      const errorInfo = handleAPIError(error)
      
      dispatch({
        type: AuthActionTypes.LOGIN_FAILURE,
        payload: errorInfo.message,
      })

      toast.error(errorInfo.message)

      return {
        success: false,
        error: errorInfo,
      }
    }
  }

  // Logout function
  const logout = async () => {
    try {
      // Call logout API
      await authAPI.logout()
    } catch (error) {
      console.error('Logout API error:', error)
      // Continue with logout even if API call fails
    } finally {
      // Clear local storage
      localStorage.removeItem('authToken')
      localStorage.removeItem('user')

      // Clear crypto keys
      if (state.user) {
        await cryptoUtils.deletePrivateKey(state.user.username)
      }

      dispatch({ type: AuthActionTypes.LOGOUT })

      toast.success('Logged out successfully')
    }
  }

  // Get user profile
  const getProfile = async () => {
    try {
      const response = await authAPI.getProfile()
      
      // Update user data in state and localStorage
      const updatedUser = response.data.user
      localStorage.setItem('user', JSON.stringify(updatedUser))
      
      dispatch({
        type: AuthActionTypes.LOAD_USER,
        payload: {
          user: updatedUser,
          token: state.token,
        },
      })

      return { success: true, data: updatedUser }
    } catch (error) {
      const errorInfo = handleAPIError(error)
      
      if (errorInfo.status === 401) {
        // Token is invalid, logout user
        logout()
      }

      return { success: false, error: errorInfo }
    }
  }

  // Change password
  const changePassword = async (passwordData) => {
    try {
      // Get current private key
      const privateKey = await cryptoUtils.getPrivateKey(
        state.user.username,
        passwordData.currentPassword
      )

      // Change password via API
      const response = await authAPI.changePassword(passwordData)

      // Re-encrypt and store private key with new password
      await cryptoUtils.storePrivateKey(
        privateKey,
        passwordData.newPassword,
        state.user.username
      )

      toast.success('Password changed successfully')

      return { success: true, data: response.data }
    } catch (error) {
      const errorInfo = handleAPIError(error)
      toast.error(errorInfo.message)
      return { success: false, error: errorInfo }
    }
  }

  // Clear error
  const clearError = () => {
    dispatch({ type: AuthActionTypes.CLEAR_ERROR })
  }

  // Check if user has private key locally
  const hasPrivateKey = async () => {
    if (!state.user) return false
    return await cryptoUtils.hasPrivateKey(state.user.username)
  }

  // Get private key for operations
  const getPrivateKey = async (password) => {
    if (!state.user) {
      throw new Error('User not authenticated')
    }

    try {
      return await cryptoUtils.getPrivateKey(state.user.username, password)
    } catch (error) {
      throw new Error('Failed to retrieve private key. Please check your password.')
    }
  }

  // Context value
  const value = {
    // State
    user: state.user,
    token: state.token,
    loading: state.loading,
    error: state.error,
    isAuthenticated: state.isAuthenticated,

    // Actions
    register,
    login,
    logout,
    getProfile,
    changePassword,
    clearError,
    hasPrivateKey,
    getPrivateKey,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext