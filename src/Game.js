import './Game.css'
import React, { useState, useEffect } from 'react';

const Lobby = () => {
  const numbers = [0,1,2,3,4,5,6,7,8,9]
  const [hoveredIndex, setHoveredIndex] = useState(null)
  const [problem, setProblem] = useState('')
  const [numOfPlacement, setNumOfPlacement] = useState(0)
  const [answer, setAnswer] = useState('')

  const randomNumberGenerator = () => {
    return Math.floor(Math.random() * 1001)
  }

  const randomOperatorGenerator = () => {
    const operators = ['+', '-', '*', '÷'];
    return operators[Math.floor(Math.random() * operators.length)]
  }

  const randomMathProblemGenerator = () => {
    let result = null
    let num1 = 0
    let num2 = 0
    let operator = ''

    while (result === null || result < 10 || result > 9999) {
      num1 = randomNumberGenerator()
      num2 = randomNumberGenerator()
      operator = randomOperatorGenerator()

      result = calculateAnswer(num1, num2, operator)

      if (result === 'undefined') {
        result = null
      }
    }

    const newProblem = `${num1} ${operator} ${num2}`
    setProblem(newProblem)

    const resultString = result.toString()
    setNumOfPlacement(resultString.length)

    setAnswer(resultString)
  }

  const calculateAnswer = (num1, num2, operator) => {
    switch (operator) {
      case '+':
        return num1 + num2;
      case '-':
        return num1 - num2;
      case '*':
        return num1 * num2;
      case '÷':
        return num2 !== 0 ? num1 / num2 : 'undefined'; 
      default:
        return null;
    }
  }

  useEffect(() => {
    randomMathProblemGenerator()
  }, [])

  const boxes = Array.from({ length: numOfPlacement })

  const profileLength = Array.from({ length: 2})

  return (
    <>
      <div className="container">
        <div className="container-item1">
          <p className='displayProblem' style={{fontSize: '60px'}}>{problem}</p>
            {boxes.map((_, index) => (
              <div key={index} className='inputBox' style={{ fontSize: '40px', color: '#2d2e2e'}}>
                {numOfPlacement === 3 && index === 0 && answer[0]} 
                {numOfPlacement === 4 && index === 0 && answer[0]} 
                {numOfPlacement === 4 && index === 1 && answer[1]}
              </div>
            ))}
        </div>
        <div className="container-item2">
          <p className='displayProblem' style={{fontSize: '60px'}}>{problem}</p>
            {boxes.map((_, index) => (
              <div key={index} className='inputBox' style={{ fontSize: '40px', color: '#2d2e2e'}}>
                {numOfPlacement === 3 && index === 0 && answer[0]} 
                {numOfPlacement === 4 && index === 0 && answer[0]} 
                {numOfPlacement === 4 && index === 1 && answer[1]}
              </div>
            ))}
        </div>
        <div className="numberButtons">
          {numbers.map((number, index) => (
            <button key={number} style={{margin: '12px', width: '40px', borderRadius: '5px', height: '50px', backgroundColor: hoveredIndex === index ? '#7a575e': '#E5989B'}}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
            > 
              {number} 
            </button>
          ))}
        </div>
      </div>
      <div className='profile-container'>
        {profileLength.map((element, index) => (
          <div className='firstTeam'></div>
        ))}
        {profileLength.map((element, index) => (
          <div className='secondTeam'></div>
        ))}
      </div>
    </>
  )
}

export default Lobby