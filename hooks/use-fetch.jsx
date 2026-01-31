import { useState } from "react"
import { toast } from "sonner"

const useFetch = (cb) => {
    const [data, setData] = useState(null)
    const [error, setError] = useState(null)
    const [loading, setLoading] = useState(false)

    const fetchData = async (...args) => {
        setLoading(true)
        setError(null)
        try {
            const response = await cb(...args)
            setData(response)
        } catch (error) {
            setError(error)
            toast.error(error.message)
        } finally {
            setLoading(false)
        }
    }

    return { data, error, loading, fetchData, setData }
}

export default useFetch
